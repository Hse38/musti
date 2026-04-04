from datetime import date
from decimal import Decimal

from django.utils import timezone
from django.utils.text import slugify

from apps.competitions.models import Competition, Participant, Team
from apps.notifications.service import NotificationService
from apps.validation.ai_extractor import InvoiceExtractor
from apps.validation.engine import ValidationEngine

from .models import AnalysisSession, TicketSubmission
from .parsers import PaymentRequestParser, SupportRequestParser


TRANSPORT_AI_MAP = {
    "otobüs": "bus",
    "otobus": "bus",
    "bus": "bus",
    "tren": "train",
    "train": "train",
    "uçak": "plane",
    "ucak": "plane",
    "plane": "plane",
    "diğer": "other",
    "diger": "other",
    "other": "other",
}


def _map_ai_transport(s: str) -> str:
    if not s:
        return ""
    key = str(s).strip().lower()
    return TRANSPORT_AI_MAP.get(key, "other")


def _parse_date(s) -> date | None:
    if not s:
        return None
    if isinstance(s, date):
        return s
    from datetime import datetime

    for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(str(s)[:10], fmt).date()
        except ValueError:
            continue
    return None


def _looks_like_multiple_participants(full_name: str) -> bool:
    s = (full_name or "").strip()
    if not s:
        return False
    lower = s.lower()
    if " ve " in lower or " / " in lower:
        return True
    if s.count(",") >= 1 and len(s) > 20:
        return True
    parts = s.split()
    if len(parts) >= 6:
        return True
    return False


def _team_for_competition(competition: Competition, team_name: str) -> Team:
    tn = (team_name or "Bilinmiyor").strip()[:255] or "Bilinmiyor"
    base = slugify(tn)[:30] or "takim"
    code = f"{base}-{competition.pk}"[:50]
    team, _ = Team.objects.get_or_create(
        team_code=code,
        defaults={"competition": competition, "name": tn},
    )
    if team.name != tn:
        team.name = tn
        team.save(update_fields=["name"])
    return team


def _pick_stub_for_row(tc: str, remaining: list[TicketSubmission]):
    """Önce dosya adında TC, yoksa sıradaki stub."""
    tc_clean = (tc or "").strip()
    for i, s in enumerate(remaining):
        if not s.invoice_file:
            continue
        try:
            name = s.invoice_file.name or ""
        except Exception:
            name = ""
        if tc_clean and tc_clean in name.replace(" ", ""):
            return remaining.pop(i)
    if remaining:
        return remaining.pop(0)
    return None


def run_session_analysis(session_id):
    session = AnalysisSession.objects.select_related("competition").get(pk=session_id)
    session.status = "processing"
    session.error_message = ""
    session.save(update_fields=["status", "error_message"])
    try:
        _process_session(session)
    except Exception as e:
        session.status = "failed"
        session.error_message = str(e)
        session.save(update_fields=["status", "error_message"])
        raise


def _process_session(session: AnalysisSession):
    competition = session.competition
    if not competition:
        raise ValueError("Oturum için yarışma tanımlı değil.")

    support_parser = SupportRequestParser()
    payment_parser = PaymentRequestParser()

    participants_data = support_parser.parse(session.transport_request_file.path)
    submissions_data = payment_parser.parse(session.ticket_payment_file.path)

    team_name = ""
    if participants_data:
        team_name = participants_data[0].get("team_name") or ""
    if not team_name and submissions_data:
        team_name = submissions_data[0].get("team_name") or ""

    team = _team_for_competition(competition, team_name)

    participants_by_tc = {}
    for p_data in participants_data:
        participant, _ = Participant.objects.update_or_create(
            team=team,
            tc_id=p_data["tc_id"],
            defaults={
                "full_name": p_data["full_name"] or "İsimsiz",
                "email": p_data.get("email") or "",
                "phone": p_data.get("phone") or "",
                "transport_type": p_data["transport_type"],
                "is_supported": p_data["is_supported"],
                "city_from": p_data.get("city_from") or "",
                "city_to": p_data.get("city_to") or "",
                "kys_member_id": p_data.get("kys_member_id") or "",
                "kys_id": p_data.get("kys_member_id") or "",
            },
        )
        participants_by_tc[p_data["tc_id"]] = participant

    max_count = session.supported_quota_override or competition.max_supported_members
    supported_sorted = sorted(
        [p for p in participants_by_tc.values() if p.is_supported],
        key=lambda x: x.pk,
    )
    if len(supported_sorted) > max_count:
        for p in supported_sorted[max_count:]:
            p.is_supported = False
            p.save(update_fields=["is_supported"])

    extractor = InvoiceExtractor()
    engine = ValidationEngine()

    approved = 0
    rejected = 0
    total_amount = Decimal("0")

    stubs = list(
        TicketSubmission.objects.filter(session=session).order_by("id")
    )
    remaining = stubs[:]

    for sub_data in submissions_data:
        tc = sub_data["tc_id"]
        participant = participants_by_tc.get(tc)

        if sub_data.get("invoice_source") == "drive_link":
            stub = None
        else:
            stub = _pick_stub_for_row(tc, remaining)
        if stub:
            submission = stub
        else:
            submission = TicketSubmission(session=session)

        submission.session = session
        submission.participant = participant
        submission.invoice_drive_link = sub_data.get("invoice_drive_link") or None
        submission.basvuru_id = sub_data.get("basvuru_id") or ""
        submission.account_holder_tc = sub_data.get("account_holder_tc") or ""
        submission.payment_form_snapshot = sub_data
        submission.rejection_reasons = []
        submission.status = "rejected"
        submission.validated_at = None
        submission.is_duplicate = False
        submission.ai_extracted_data = {}
        submission.invoice_date = None
        submission.invoice_owner_name = ""
        submission.transport_type_on_invoice = ""

        amount_dec = None
        if sub_data.get("amount") is not None:
            try:
                amount_dec = Decimal(str(sub_data["amount"]))
            except Exception:
                amount_dec = None
        submission.invoice_amount = amount_dec

        if not stub:
            submission.invoice_file = None

        submission.save()

        extra_errors = []
        if _looks_like_multiple_participants(sub_data.get("full_name", "")):
            extra_errors.append(
                "Birden fazla kişi tek satırda; her katılımcı ayrı gönderilmelidir"
            )

        st = sub_data.get("existing_status") or ""
        if "❌" in st or "hata" in st.lower():
            extra_errors.append("Ödeme formunda kayıt hatalı olarak işaretlendi")

        if extra_errors:
            submission.status = "rejected"
            submission.rejection_reasons = extra_errors
            submission.validated_at = timezone.now()
            submission.save()
            rejected += 1
            if participant and participant.email:
                NotificationService().send_rejection(participant, extra_errors)
            continue

        if not participant:
            submission.status = "rejected"
            submission.rejection_reasons = [
                "Katılımcı destek talep dosyasında bulunamadı"
            ]
            submission.validated_at = timezone.now()
            submission.save()
            rejected += 1
            continue

        participant.iban = sub_data.get("iban") or participant.iban
        participant.bank_name = sub_data.get("bank_name") or participant.bank_name
        participant.account_holder_name = (
            sub_data.get("account_holder_name") or participant.account_holder_name
        )
        if sub_data.get("email"):
            participant.email = sub_data["email"] or participant.email
        if sub_data.get("phone"):
            participant.phone = sub_data["phone"] or participant.phone
        participant.save()

        has_file = bool(submission.invoice_file)
        has_drive = bool(submission.invoice_drive_link)

        if sub_data.get("invoice_source") == "file_upload" and has_file:
            try:
                path = submission.invoice_file.path
            except Exception:
                path = None
            if path:
                data = extractor.extract(path)
                submission.ai_extracted_data = data
                amt = data.get("amount")
                if amt is not None and submission.invoice_amount is None:
                    try:
                        submission.invoice_amount = Decimal(str(amt))
                    except Exception:
                        pass
                submission.invoice_date = _parse_date(data.get("date"))
                submission.invoice_owner_name = (data.get("owner_name") or "")[:255]
                submission.transport_type_on_invoice = _map_ai_transport(
                    data.get("transport_type") or ""
                )
                submission.save(
                    update_fields=[
                        "ai_extracted_data",
                        "invoice_amount",
                        "invoice_date",
                        "invoice_owner_name",
                        "transport_type_on_invoice",
                    ]
                )
        elif sub_data.get("invoice_source") == "drive_link":
            submission.ai_extracted_data = {
                "source": "google_drive",
                "link": sub_data.get("invoice_drive_link"),
            }
            submission.save(update_fields=["ai_extracted_data"])

        if not has_file and not has_drive:
            submission.rejection_reasons = [
                "Fatura dosyası veya Drive bağlantısı yok"
            ]
            submission.status = "rejected"
            submission.validated_at = timezone.now()
            submission.save()
            rejected += 1
            NotificationService().send_rejection(
                participant, submission.rejection_reasons
            )
            continue

        if participant.transport_type == "plane":
            submission.rejection_reasons = [
                "Uçak bileti seçilmiş — bilet yükleme yapılmaz"
            ]
            submission.status = "rejected"
            submission.validated_at = timezone.now()
            submission.save()
            rejected += 1
            NotificationService().send_rejection(
                participant, submission.rejection_reasons
            )
            continue

        vr = engine.validate(submission, participant, competition)
        submission.rejection_reasons = vr["errors"]
        submission.status = "approved" if vr["approved"] else "rejected"
        submission.validated_at = timezone.now()
        submission.is_duplicate = any(
            "Mükerrer" in e for e in (vr["errors"] or [])
        )
        submission.save()

        if vr["approved"]:
            approved += 1
            if submission.invoice_amount:
                total_amount += submission.invoice_amount
            NotificationService().send_approval(participant, session)
        else:
            rejected += 1
            NotificationService().send_rejection(participant, vr["errors"])

    for s in remaining:
        s.delete()

    session.summary = {
        "total": len(submissions_data),
        "approved": approved,
        "rejected": rejected,
        "total_amount": str(total_amount),
    }
    session.status = "completed"
    session.completed_at = timezone.now()
    session.save(update_fields=["summary", "status", "completed_at"])
