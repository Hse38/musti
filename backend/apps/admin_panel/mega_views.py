from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.authentication import SessionAuthentication

from apps.admin_panel.models import SiteSettings
from apps.competitions.import_service import process_xlsx_upload
from apps.competitions.models import Competition
from apps.faq.models import FAQConversation, FAQDocument
from apps.i18n_app.models import Language, Translation
from apps.reports.generator import ReportGenerator
from core.ai_client import ClaudeAIClient
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
                "magic_link_subject": s.magic_link_subject,
                "magic_link_body": s.magic_link_body,
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
            "smtp_password",
            "email_from_name",
            "magic_link_subject",
            "magic_link_body",
        ):
            if f in request.data:
                setattr(s, f, request.data[f])
        s.save()
        return Response({"ok": True})


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
        data = gen.generate_flight_report()
        resp = HttpResponse(
            data,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        resp["Content-Disposition"] = 'attachment; filename="ucak_listesi.xlsx"'
        return resp


class AdminInvoiceManualReviewView(MegaAuthMixin, APIView):
    def patch(self, request, pk):
        from apps.invoices.models import Invoice

        inv = get_object_or_404(Invoice, pk=pk)
        inv.status = request.data.get("status", inv.status)
        inv.save(update_fields=["status"])
        return Response({"ok": True})
