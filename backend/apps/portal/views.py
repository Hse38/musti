from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import MagicLink
from apps.competitions.models import Participant
from core.participant_user import ensure_user_for_participant
from apps.faq.models import FAQConversation, FAQDocument
from apps.invoices.models import Invoice
from apps.realtime.consumers import broadcast_admin_sync, notify_participant_sync
from apps.transport.models import TransportRequest
from core.ai_client import ClaudeAIClient

User = get_user_model()


def _tokens_for(user):
    r = RefreshToken.for_user(user)
    return {"access": str(r.access_token), "refresh": str(r)}


class MagicLinkRequestView(APIView):
    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return Response({"detail": "E-posta gerekli."}, status=400)
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"detail": "Kullanıcı bulunamadı."}, status=404)
        link = MagicLink.objects.create(
            user=user,
            expires_at=timezone.now() + timedelta(hours=48),
        )
        return Response({"ok": True, "token": str(link.token)})


class MagicLinkVerifyView(APIView):
    def post(self, request):
        token = request.data.get("token")
        if not token:
            return Response({"detail": "token gerekli"}, status=400)
        try:
            import uuid

            u = uuid.UUID(str(token))
        except ValueError:
            return Response({"detail": "Geçersiz token"}, status=400)
        link = MagicLink.objects.filter(token=u, is_used=False).first()
        if not link or link.expires_at < timezone.now():
            return Response({"detail": "Token geçersiz veya süresi dolmuş"}, status=400)
        auth_user = link.user
        if link.participant_id:
            auth_user = ensure_user_for_participant(link.participant)
            if not link.user_id:
                link.user = auth_user
                link.save(update_fields=["user"])
            p = link.participant
            if p and not p.first_login_at:
                p.first_login_at = timezone.now()
                p.last_activity_at = timezone.now()
                p.save(update_fields=["first_login_at", "last_activity_at"])
        elif auth_user is None:
            return Response({"detail": "Geçersiz bağlantı"}, status=400)
        link.is_used = True
        link.save(update_fields=["is_used"])
        if link.participant_id:
            broadcast_admin_sync(
                {
                    "type": "participant_login",
                    "data": {
                        "participant_name": link.participant.full_name,
                        "team_name": link.participant.team.name
                        if link.participant.team
                        else "",
                        "timestamp": timezone.now().isoformat(),
                    },
                }
            )
        return Response(_tokens_for(auth_user))


class TCTeamLoginView(APIView):
    def post(self, request):
        tc = (request.data.get("tc_id") or "").strip()
        tid = (request.data.get("team_id") or "").strip()
        if not tc or not tid:
            return Response({"detail": "tc_id ve team_id gerekli"}, status=400)
        p = (
            Participant.objects.filter(tc_id=tc, team__team_id=tid)
            .select_related("team", "user")
            .first()
        )
        if not p or not p.user:
            return Response({"detail": "Eşleşme yok"}, status=404)
        now = timezone.now()
        if not p.first_login_at:
            p.first_login_at = now
            p.last_activity_at = now
            p.save(update_fields=["first_login_at", "last_activity_at"])
        role = "captain" if (p.is_captain or p.user.role == "captain") else "participant"
        broadcast_admin_sync(
            {
                "type": "participant_login",
                "data": {
                    "participant_name": p.full_name,
                    "team_name": p.team.name if p.team else "",
                    "timestamp": now.isoformat(),
                },
            }
        )
        data = _tokens_for(p.user)
        data["role"] = role
        data["participant_id"] = p.id
        return Response(data)


class MeView(APIView):
    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "Yetkisiz"}, status=401)
        p = getattr(request.user, "participant_profile", None)
        if not p:
            return Response({"participant": None})
        return Response(
            {
                "participant": {
                    "id": p.id,
                    "full_name": p.full_name,
                    "tc_id": p.tc_id,
                    "team_id": p.team.team_id,
                    "is_captain": p.is_captain,
                    "onboarding_completed": p.onboarding_completed,
                }
            }
        )


class MeStatusView(APIView):
    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"detail": "Yetkisiz"}, status=401)
        p = getattr(request.user, "participant_profile", None)
        if not p:
            return Response({"steps": []})
        tr = TransportRequest.objects.filter(participant=p).first()
        steps = [
            {"key": "transport", "done": bool(tr)},
            {"key": "details", "done": tr and tr.status != "pending"},
            {"key": "invoice", "done": tr and tr.invoices.exists()},
        ]
        return Response({"steps": steps, "transport_status": tr.status if tr else None})


class TransportSelectView(APIView):
    def post(self, request):
        if not request.user.is_authenticated:
            return Response(status=401)
        p = getattr(request.user, "participant_profile", None)
        if not p:
            return Response({"detail": "Katılımcı yok"}, status=400)
        tt = request.data.get("transport_type")
        if tt not in ("plane", "bus", "train", "self"):
            return Response({"detail": "Geçersiz tip"}, status=400)
        tr, _ = TransportRequest.objects.update_or_create(
            participant=p,
            defaults={"transport_type": tt, "status": "pending"},
        )
        p.transport_type = {"plane": "plane", "bus": "bus", "train": "train", "self": "none"}.get(
            tt, "none"
        )
        now = timezone.now()
        p.transport_selected_at = now
        p.last_activity_at = now
        p.save(update_fields=["transport_type", "transport_selected_at", "last_activity_at"])
        notify_participant_sync(
            p.id,
            {
                "type": "transport_selected",
                "data": {"transport_type": tt},
            },
        )
        return Response({"ok": True, "transport_request_id": tr.id})


class TransportDetailsView(APIView):
    def post(self, request):
        if not request.user.is_authenticated:
            return Response(status=401)
        p = getattr(request.user, "participant_profile", None)
        if not p:
            return Response(status=400)
        tr = TransportRequest.objects.filter(participant=p).first()
        if not tr:
            return Response({"detail": "Önce ulaşım seçin"}, status=400)
        d = request.data
        if tr.transport_type == "plane":
            tr.preferred_arrival_date = d.get("preferred_arrival_date") or tr.preferred_arrival_date
            tr.preferred_departure_date = (
                d.get("preferred_departure_date") or tr.preferred_departure_date
            )
            tr.flight_notes = d.get("flight_notes", "")
            tr.status = "info_collected"
        elif tr.transport_type in ("bus", "train"):
            tr.origin_city = d.get("origin_city", "")
            tr.bank_name = d.get("bank_name", "")
            tr.account_holder_name = d.get("account_holder_name", "")
            tr.iban = d.get("iban", "")
            tr.status = "info_collected"
            p.bank_name = tr.bank_name
            p.account_holder_name = tr.account_holder_name
            p.iban = tr.iban
            p.phone = d.get("phone", p.phone)
            p.save(update_fields=["bank_name", "account_holder_name", "iban", "phone"])
        elif tr.transport_type == "self":
            tr.status = "self_noted"
        tr.save()
        now = timezone.now()
        p.last_activity_at = now
        p.save(update_fields=["last_activity_at"])
        notify_participant_sync(
            p.id,
            {"type": "details_saved", "data": {}},
        )
        return Response({"ok": True})


class TransportPlaneDetailsView(APIView):
    def post(self, request):
        if not request.user.is_authenticated:
            return Response(status=401)
        p = getattr(request.user, "participant_profile", None)
        if not p:
            return Response(status=400)
        tr = TransportRequest.objects.filter(participant=p).first()
        if not tr or tr.transport_type != "plane":
            return Response({"detail": "Uçak seçimi gerekli"}, status=400)
        return TransportDetailsView().post(request)


class TransportInvoiceDetailsView(APIView):
    def post(self, request):
        if not request.user.is_authenticated:
            return Response(status=401)
        p = getattr(request.user, "participant_profile", None)
        if not p:
            return Response(status=400)
        tr = TransportRequest.objects.filter(participant=p).first()
        if not tr or tr.transport_type not in ("bus", "train"):
            return Response({"detail": "Otobüs veya tren seçimi gerekli"}, status=400)
        iban = (request.data.get("iban") or "").replace(" ", "").upper()
        bank_name = (request.data.get("bank_name") or "").upper()
        blocked = ("PAPARA", "TOSLA")
        hay = iban + bank_name
        if any(x in hay for x in blocked):
            return Response(
                {
                    "detail": (
                        "Papara/Tosla veya benzeri ödeme kuruluşu IBAN’ı kabul edilmez; "
                        "lütfen banka hesabı IBAN’ı girin."
                    )
                },
                status=400,
            )
        if iban and len(iban) >= 15 and not iban.startswith("TR"):
            return Response(
                {"detail": "Türkiye için IBAN TR ile başlamalıdır."},
                status=400,
            )
        return TransportDetailsView().post(request)


class InvoiceUploadView(APIView):
    def post(self, request):
        if not request.user.is_authenticated:
            return Response(status=401)
        p = getattr(request.user, "participant_profile", None)
        if not p:
            return Response(status=400)
        tr = TransportRequest.objects.filter(participant=p).first()
        if not tr or tr.transport_type == "plane":
            return Response({"detail": "Uçak seçiminde fatura yüklenemez"}, status=400)
        f = request.FILES.get("file")
        if not f:
            return Response({"detail": "Dosya gerekli"}, status=400)
        inv = Invoice.objects.create(
            transport_request=tr,
            uploaded_by=request.user,
            file=f,
        )
        tr.status = "invoice_uploaded"
        tr.save(update_fields=["status"])
        path = inv.file.path
        ai = ClaudeAIClient().extract_invoice(path, p.full_name, p.team.competition)
        inv.ai_extracted_amount = ai.get("amount")
        try:
            if ai.get("date"):
                inv.ai_extracted_date = datetime.strptime(
                    str(ai["date"])[:10], "%Y-%m-%d"
                ).date()
        except Exception:
            pass
        inv.ai_extracted_owner = (ai.get("owner_name") or "")[:255]
        inv.ai_extracted_transport_type = (ai.get("transport_type") or "")[:50]
        inv.ai_extracted_origin = (ai.get("origin") or "")[:100]
        inv.ai_extracted_destination = (ai.get("destination") or "")[:100]
        inv.ai_confidence = float(ai.get("confidence") or 0)
        inv.ai_raw_response = ai
        conf = inv.ai_confidence or 0
        if conf < 0.7:
            inv.status = "manual_review"
            broadcast_admin_sync(
                {
                    "type": "low_confidence",
                    "data": {
                        "invoice_id": inv.id,
                        "participant_name": p.full_name,
                        "team_name": p.team.name if p.team else "",
                        "amount": float(inv.ai_extracted_amount or 0),
                        "confidence": conf,
                        "timestamp": timezone.now().isoformat(),
                    },
                }
            )
        inv.save()
        now = timezone.now()
        if not p.invoice_uploaded_at:
            p.invoice_uploaded_at = now
        p.last_activity_at = now
        p.save(update_fields=["invoice_uploaded_at", "last_activity_at"])
        broadcast_admin_sync(
            {
                "type": "new_invoice",
                "data": {
                    "invoice_id": inv.id,
                    "participant_name": p.full_name,
                    "team_name": p.team.name if p.team else "",
                    "amount": float(inv.ai_extracted_amount or 0),
                    "confidence": conf,
                    "timestamp": now.isoformat(),
                },
            }
        )
        return Response({"id": inv.id, "status": inv.status, "confidence": conf})


class InvoiceListView(APIView):
    def get(self, request):
        if not request.user.is_authenticated:
            return Response(status=401)
        p = getattr(request.user, "participant_profile", None)
        if not p:
            return Response([])
        tr = TransportRequest.objects.filter(participant=p).first()
        if not tr:
            return Response([])
        qs = tr.invoices.all()
        return Response(
            [
                {
                    "id": i.id,
                    "status": i.status,
                    "amount": str(i.ai_extracted_amount or ""),
                    "confidence": i.ai_confidence,
                }
                for i in qs
            ]
        )


class FAQAskView(APIView):
    def post(self, request):
        if not request.user.is_authenticated:
            return Response(status=401)
        p = getattr(request.user, "participant_profile", None)
        if not p:
            return Response({"detail": "Katılımcı profili yok"}, status=400)
        q = (request.data.get("question") or "").strip()
        if not q:
            return Response({"detail": "Soru gerekli"}, status=400)
        docs = FAQDocument.objects.filter(is_active=True)
        content = "\n".join(d.content for d in docs if d.content)
        lang = getattr(request.user, "preferred_language", "tr") or "tr"
        ai = ClaudeAIClient().answer_faq(q, content, lang)
        conv = FAQConversation.objects.create(
            participant=p,
            question=q,
            answer=ai.get("answer", ""),
            answered_by_ai=bool(ai.get("can_answer")),
        )
        if not ai.get("can_answer") or ai.get("confidence", 0) < 0.4:
            conv.escalated_to_admin = True
            conv.save(update_fields=["escalated_to_admin"])
            broadcast_admin_sync(
                {
                    "type": "faq_escalation",
                    "data": {
                        "participant_name": p.full_name if p else "",
                        "question": q,
                        "conversation_id": conv.id,
                        "timestamp": timezone.now().isoformat(),
                    },
                }
            )
            return Response(
                {
                    "answer": "Sorunuz yöneticiye iletildi; kısa sürede yanıt alacaksınız.",
                    "escalated": True,
                }
            )
        conv.save()
        return Response({"answer": ai.get("answer", ""), "escalated": False})


class FAQHistoryView(APIView):
    def get(self, request):
        if not request.user.is_authenticated:
            return Response(status=401)
        p = getattr(request.user, "participant_profile", None)
        if not p:
            return Response([])
        qs = FAQConversation.objects.filter(participant=p).order_by("-created_at")[:50]
        return Response(
            [
                {
                    "question": c.question,
                    "answer": c.answer,
                    "created_at": c.created_at.isoformat(),
                }
                for c in qs
            ]
        )


class CaptainTeamView(APIView):
    def get(self, request):
        if not request.user.is_authenticated:
            return Response(status=403)
        p = getattr(request.user, "participant_profile", None)
        if not p or not (p.is_captain or request.user.role == "captain"):
            return Response(status=403)
        members = Participant.objects.filter(team=p.team).select_related("user")
        return Response(
            {
                "team": p.team.name,
                "members": [
                    {
                        "id": m.id,
                        "full_name": m.full_name,
                        "tc_id": m.tc_id,
                        "onboarding_completed": m.onboarding_completed,
                    }
                    for m in members
                ],
            }
        )


class CaptainUploadInvoiceView(APIView):
    def post(self, request):
        if not request.user.is_authenticated:
            return Response(status=403)
        cap = getattr(request.user, "participant_profile", None)
        if not cap or not (cap.is_captain or request.user.role == "captain"):
            return Response(status=403)
        pid = request.data.get("participant_id")
        p = Participant.objects.filter(pk=pid, team=cap.team).first()
        if not p:
            return Response({"detail": "Üye bulunamadı"}, status=404)
        tr_existing = TransportRequest.objects.filter(participant=p).first()
        if tr_existing and tr_existing.transport_type == "plane":
            return Response(
                {"detail": "Uçak seçimi yapan üye için fatura yüklenemez."},
                status=400,
            )
        f = request.FILES.get("invoice_file") or request.FILES.get("file")
        if not f:
            return Response({"detail": "Dosya gerekli"}, status=400)
        tr, _ = TransportRequest.objects.get_or_create(
            participant=p,
            defaults={"transport_type": "bus", "status": "pending"},
        )
        inv = Invoice.objects.create(
            transport_request=tr,
            uploaded_by=request.user,
            file=f,
        )
        broadcast_admin_sync(
            {
                "type": "captain_upload",
                "data": {
                    "invoice_id": inv.id,
                    "participant_name": p.full_name,
                    "timestamp": timezone.now().isoformat(),
                },
            }
        )
        return Response({"id": inv.id})
