from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import SessionAuthentication

from datetime import timedelta

from django.utils import timezone

from apps.accounts.models import MagicLink
from apps.admin_panel.models import SiteSettings
from apps.competitions.import_service import process_xlsx_upload
from apps.competitions.models import Competition, Participant
from apps.faq.models import FAQConversation, FAQDocument
from apps.i18n_app.models import Language, Translation
from apps.reports.generator import ReportGenerator
from core.ai_client import ClaudeAIClient
from core.audit_log import log_action
from core.mail_utils import send_mail_via_site_settings
from core.participant_user import ensure_user_for_participant
from core.permissions import IsOperator


class MegaAuthMixin:
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsOperator]


class SiteSettingsView(MegaAuthMixin, APIView):
    def get(self, request):
        s = SiteSettings.load()
        return Response(
            {
                "site_name": s.site_name,
                "primary_color": s.primary_color,
                "secondary_color": s.secondary_color,
                "support_email": s.support_email,
                "support_phone": s.support_phone,
                "smtp_host": s.smtp_host,
                "smtp_port": s.smtp_port,
                "smtp_user": s.smtp_user,
                "smtp_use_tls": s.smtp_use_tls,
                "email_from_name": s.email_from_name,
                "magic_link_subject": s.magic_link_subject,
                "magic_link_body": s.magic_link_body,
                "invoice_approved_subject": s.invoice_approved_subject,
                "invoice_approved_body": s.invoice_approved_body,
                "invoice_rejected_subject": s.invoice_rejected_subject,
                "invoice_rejected_body": s.invoice_rejected_body,
                "reminder_subject": s.reminder_subject,
                "reminder_body": s.reminder_body,
            }
        )

    def put(self, request):
        s = SiteSettings.load()
        for f in (
            "site_name",
            "primary_color",
            "secondary_color",
            "support_email",
            "support_phone",
            "smtp_host",
            "smtp_port",
            "smtp_user",
            "smtp_use_tls",
            "email_from_name",
            "magic_link_subject",
            "magic_link_body",
            "invoice_approved_subject",
            "invoice_approved_body",
            "invoice_rejected_subject",
            "invoice_rejected_body",
            "reminder_subject",
            "reminder_body",
        ):
            if f in request.data:
                setattr(s, f, request.data[f])
        if request.data.get("smtp_password"):
            s.smtp_password = request.data["smtp_password"]
        s.save()
        return Response({"ok": True})


class ParticipantResendMagicView(MegaAuthMixin, APIView):
    def post(self, request, pk):
        p = get_object_or_404(Participant, pk=pk)
        ensure_user_for_participant(p)
        p.refresh_from_db()
        MagicLink.objects.filter(participant=p, is_used=False).update(is_used=True)
        link = MagicLink.objects.create(
            user=p.user,
            participant=p,
            expires_at=timezone.now() + timedelta(hours=48),
        )
        s = SiteSettings.load()
        frontend = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
        comp = p.team.competition if p.team else None
        magic_url = f"{frontend}/tr?magic_token={link.token}"
        body = s.magic_link_body.format(
            name=p.full_name,
            link=magic_url,
            competition=comp.name if comp else "",
            deadline=(comp.end_date.isoformat() if comp and comp.end_date else "—"),
        )
        if p.email:
            send_mail_via_site_settings(
                s.magic_link_subject, body, [p.email], fail_silently=True
            )
            p.magic_link_sent_at = timezone.now()
            p.save(update_fields=["magic_link_sent_at"])
            log_action(
                user=request.user,
                action="magic_link_resent",
                target_type="participant",
                target_id=p.pk,
            )
        return Response({"ok": True, "sent": bool(p.email)})


class CompetitionSendMagicLinksView(MegaAuthMixin, APIView):
    def post(self, request, pk):
        comp = get_object_or_404(Competition, pk=pk)
        s = SiteSettings.load()
        frontend = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
        sent = 0
        for p in Participant.objects.filter(team__competition=comp).select_related("team"):
            if not p.email or "@" not in p.email:
                continue
            ensure_user_for_participant(p)
            p.refresh_from_db()
            MagicLink.objects.filter(user=p.user, is_used=False).update(is_used=True)
            MagicLink.objects.filter(participant=p, is_used=False).update(is_used=True)
            link = MagicLink.objects.create(
                user=p.user,
                participant=p,
                expires_at=timezone.now() + timedelta(hours=48),
            )
            magic_url = f"{frontend}/tr?magic_token={link.token}"
            body = s.magic_link_body.format(
                name=p.full_name,
                link=magic_url,
                competition=comp.name,
                deadline=comp.end_date.isoformat() if comp.end_date else "—",
            )
            try:
                ok = send_mail_via_site_settings(
                    s.magic_link_subject, body, [p.email], fail_silently=True
                )
            except Exception:
                ok = False
            if ok:
                sent += 1
                p.magic_link_sent_at = timezone.now()
                p.save(update_fields=["magic_link_sent_at"])
                log_action(
                    user=request.user,
                    action="magic_link_email_sent",
                    target_type="participant",
                    target_id=p.pk,
                    new_value={"email": p.email},
                )
        return Response({"emails_sent": sent})


class CompetitionSendReminderView(MegaAuthMixin, APIView):
    def post(self, request, pk):
        comp = get_object_or_404(Competition, pk=pk)
        s = SiteSettings.load()
        frontend = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
        sent = 0
        for p in Participant.objects.filter(
            team__competition=comp, first_login_at__isnull=True
        ):
            if not p.email:
                continue
            ensure_user_for_participant(p)
            p.refresh_from_db()
            MagicLink.objects.filter(participant=p, is_used=False).update(is_used=True)
            link = MagicLink.objects.create(
                user=p.user,
                participant=p,
                expires_at=timezone.now() + timedelta(hours=48),
            )
            url = f"{frontend}/tr?magic_token={link.token}"
            subj = s.reminder_subject or "TEKNOFEST Ulaşım"
            body = (s.reminder_body or "").format(
                name=p.full_name,
                competition=comp.name,
                link=url,
                deadline=comp.end_date.isoformat() if comp.end_date else "—",
            )
            if send_mail_via_site_settings(subj, body, [p.email], fail_silently=True):
                sent += 1
        return Response({"reminders_sent": sent})


class CompetitionUploadParticipantsView(MegaAuthMixin, APIView):
    def post(self, request, pk):
        comp = get_object_or_404(Competition, pk=pk)
        f = request.FILES.get("file")
        if not f:
            return Response({"detail": "Dosya gerekli"}, status=400)
        path = f.temporary_file_path() if hasattr(f, "temporary_file_path") else None
        if not path:
            import tempfile

            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")
            for chunk in f.chunks():
                tmp.write(chunk)
            tmp.close()
            path = tmp.name
        result = process_xlsx_upload(path, comp.id)
        return Response(result)


class FAQDocumentListCreateView(MegaAuthMixin, APIView):
    def get(self, request):
        qs = FAQDocument.objects.all()
        return Response(
            [{"id": d.id, "title": d.title, "is_active": d.is_active} for d in qs]
        )

    def post(self, request):
        d = FAQDocument.objects.create(
            title=request.data.get("title", "SSS"),
            content=request.data.get("content", ""),
            competition_id=request.data.get("competition_id") or None,
        )
        return Response({"id": d.id}, status=201)


class FAQEscalationListView(MegaAuthMixin, APIView):
    def get(self, request):
        qs = FAQConversation.objects.filter(escalated_to_admin=True).order_by(
            "-created_at"
        )[:200]
        return Response(
            [
                {
                    "id": c.id,
                    "participant": c.participant.full_name if c.participant else "",
                    "question": c.question,
                    "created_at": c.created_at.isoformat(),
                }
                for c in qs
            ]
        )


class FAQEscalationRespondView(MegaAuthMixin, APIView):
    def post(self, request, pk):
        c = get_object_or_404(FAQConversation, pk=pk)
        c.admin_response = request.data.get("response", "")
        c.answer = c.admin_response
        c.escalated_to_admin = False
        c.save()
        return Response({"ok": True})


class LanguageListCreateView(MegaAuthMixin, APIView):
    def get(self, request):
        return Response(
            list(
                Language.objects.values(
                    "code", "name", "native_name", "is_active", "is_rtl"
                )
            )
        )

    def post(self, request):
        Language.objects.create(
            code=request.data.get("code", "xx"),
            name=request.data.get("name", ""),
            native_name=request.data.get("native_name", ""),
            is_rtl=bool(request.data.get("is_rtl")),
            flag_emoji=request.data.get("flag_emoji", ""),
        )
        return Response({"ok": True}, status=201)


class LanguageAutoTranslateView(MegaAuthMixin, APIView):
    def post(self, request, code):
        lang = get_object_or_404(Language, code=code)
        base = {
            t.key: t.value
            for t in Translation.objects.filter(language__code="tr")
        }
        if not base:
            return Response({"detail": "Önce tr çevirileri ekleyin"}, status=400)
        out = ClaudeAIClient().translate_keys(base, lang.native_name or lang.code)
        for k, v in out.items():
            Translation.objects.update_or_create(
                language=lang,
                key=k,
                defaults={"value": v, "auto_translated": True},
            )
        return Response({"keys": len(out)})


class AdminFlightReportView(MegaAuthMixin, APIView):
    def get(self, request):
        gen = ReportGenerator()
        cid = request.query_params.get("competition_id")
        if cid:
            data = gen.generate_flights_report_competition(int(cid))
        else:
            data = gen.generate_flight_report()
        resp = HttpResponse(
            data,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        resp["Content-Disposition"] = 'attachment; filename="ucak_listesi.xlsx"'
        return resp


class AdminResultReportView(MegaAuthMixin, APIView):
    def get(self, request):
        cid = request.query_params.get("competition_id")
        if not cid:
            return Response({"detail": "competition_id gerekli"}, status=400)
        gen = ReportGenerator()
        data = gen.generate_result_report_competition(int(cid))
        resp = HttpResponse(
            data,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        resp["Content-Disposition"] = 'attachment; filename="sonuc_raporu.xlsx"'
        return resp


class AdminPaymentReportView(MegaAuthMixin, APIView):
    def get(self, request):
        cid = request.query_params.get("competition_id")
        if not cid:
            return Response({"detail": "competition_id gerekli"}, status=400)
        gen = ReportGenerator()
        data = gen.generate_payment_report_competition(int(cid))
        resp = HttpResponse(
            data,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        resp["Content-Disposition"] = 'attachment; filename="odeme_raporu.xlsx"'
        return resp


class AdminTrackingReportView(MegaAuthMixin, APIView):
    def get(self, request):
        cid = request.query_params.get("competition_id")
        if not cid:
            return Response({"detail": "competition_id gerekli"}, status=400)
        gen = ReportGenerator()
        data = gen.generate_tracking_report_competition(int(cid))
        resp = HttpResponse(
            data,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        resp["Content-Disposition"] = 'attachment; filename="takip_raporu.xlsx"'
        return resp


class AdminInvoiceListView(MegaAuthMixin, APIView):
    def get(self, request):
        from apps.invoices.models import Invoice

        qs = Invoice.objects.select_related(
            "transport_request__participant__team__competition",
            "uploaded_by",
        ).order_by("-created_at")
        st = request.query_params.get("status")
        if st:
            qs = qs.filter(status=st)
        out = []
        for inv in qs[:500]:
            p = inv.transport_request.participant
            out.append(
                {
                    "id": inv.id,
                    "status": inv.status,
                    "confidence": inv.ai_confidence,
                    "amount": str(inv.ai_extracted_amount or ""),
                    "ai_date": str(inv.ai_extracted_date or ""),
                    "ai_owner": inv.ai_extracted_owner,
                    "ai_transport": inv.ai_extracted_transport_type,
                    "participant_name": p.full_name,
                    "team_name": p.team.name if p.team else "",
                    "file_url": (
                        request.build_absolute_uri(inv.file.url)
                        if inv.file and getattr(inv.file, "name", "")
                        else ""
                    ),
                    "created_at": inv.created_at.isoformat(),
                }
            )
        return Response(out)


class AdminInvoiceApproveView(MegaAuthMixin, APIView):
    def patch(self, request, pk):
        from django.utils import timezone

        from apps.invoices.models import Invoice

        from apps.realtime.consumers import notify_participant_sync
        from core.audit_log import log_action
        from core.mail_utils import send_mail_via_site_settings

        inv = get_object_or_404(Invoice, pk=pk)
        inv.status = "approved"
        inv.validated_at = timezone.now()
        inv.save(update_fields=["status", "validated_at"])
        p = inv.transport_request.participant
        s = SiteSettings.load()
        comp = p.team.competition if p.team else None
        year = comp.year if comp else 2025
        cname = comp.name if comp else ""
        pay_desc = f"TEKNOFEST {year} {cname} BİLET ÖDEMESİ"
        body = s.invoice_approved_body.format(
            name=p.full_name,
            competition=cname,
            amount=str(inv.ai_extracted_amount or ""),
            payment_description=pay_desc,
            support_email=s.support_email or "",
        )
        if p.email:
            send_mail_via_site_settings(
                s.invoice_approved_subject, body, [p.email], fail_silently=True
            )
            log_action(
                user=request.user,
                action="invoice_approved_email",
                target_type="invoice",
                target_id=inv.pk,
            )
        notify_participant_sync(
            p.id,
            {
                "type": "invoice_approved",
                "data": {
                    "amount": float(inv.ai_extracted_amount or 0),
                    "message": "Faturanız onaylandı",
                },
            },
        )
        return Response({"ok": True})


class AdminInvoiceRejectView(MegaAuthMixin, APIView):
    def patch(self, request, pk):
        from django.utils import timezone

        from apps.invoices.models import Invoice

        from apps.realtime.consumers import notify_participant_sync
        from core.audit_log import log_action
        from core.mail_utils import send_mail_via_site_settings

        inv = get_object_or_404(Invoice, pk=pk)
        reason = (request.data.get("reason") or "").strip()
        reasons = [reason] if reason else ["Belirtilmedi"]
        inv.status = "rejected"
        inv.rejection_reasons = reasons
        inv.validated_at = timezone.now()
        inv.save(update_fields=["status", "rejection_reasons", "validated_at"])
        p = inv.transport_request.participant
        s = SiteSettings.load()
        frontend = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
        reasons_txt = "\n".join(f"• {r}" for r in reasons)
        body = s.invoice_rejected_body.format(
            name=p.full_name,
            reasons=reasons_txt,
            portal_url=frontend,
        )
        if p.email:
            send_mail_via_site_settings(
                s.invoice_rejected_subject, body, [p.email], fail_silently=True
            )
            log_action(
                user=request.user,
                action="invoice_rejected_email",
                target_type="invoice",
                target_id=inv.pk,
            )
        notify_participant_sync(
            p.id,
            {
                "type": "invoice_rejected",
                "data": {"reasons": reasons, "message": "Faturanız reddedildi"},
            },
        )
        return Response({"ok": True})


class AdminInvoiceManualReviewView(MegaAuthMixin, APIView):
    def patch(self, request, pk):
        from apps.invoices.models import Invoice

        inv = get_object_or_404(Invoice, pk=pk)
        inv.status = request.data.get("status", inv.status)
        inv.save(update_fields=["status"])
        return Response({"ok": True})
