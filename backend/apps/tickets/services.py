from datetime import date
from decimal import Decimal

from django.utils import timezone

from apps.notifications.service import NotificationService
from apps.validation.ai_extractor import InvoiceExtractor
from apps.validation.engine import ValidationEngine

from .excel_parser import parse_spreadsheet
from .models import AnalysisSession, TicketSubmission


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


def apply_row_overlay(participant, row: dict | None):
    if not row:
        return
    if row.get("transport_type") is not None:
        participant.transport_type = row["transport_type"]
    if row.get("is_supported") is not None:
        participant.is_supported = row["is_supported"]


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
    transport_rows = parse_spreadsheet(session.transport_request_file)
    payment_rows = parse_spreadsheet(session.ticket_payment_file)
    pay_by_tc = {r["tc_id"]: r for r in payment_rows if r.get("tc_id")}
    row_by_tc = {r["tc_id"]: r for r in transport_rows if r.get("tc_id")}

    extractor = InvoiceExtractor()
    engine = ValidationEngine()

    approved = 0
    rejected = 0
    total_amount = Decimal("0")

    submissions = list(
        TicketSubmission.objects.filter(session=session).select_related(
            "participant__team"
        )
    )

    for sub in submissions:
        participant = sub.participant
        apply_row_overlay(participant, row_by_tc.get(participant.tc_id))
        pay_row = pay_by_tc.get(participant.tc_id)
        if pay_row and pay_row.get("full_name") and not participant.full_name:
            participant.full_name = pay_row["full_name"]

        if sub.invoice_file:
            data = extractor.extract(sub.invoice_file.path)
            sub.ai_extracted_data = data
            amt = data.get("amount")
            try:
                sub.invoice_amount = Decimal(str(amt)) if amt is not None else None
            except Exception:
                sub.invoice_amount = None
            sub.invoice_date = _parse_date(data.get("date"))
            sub.invoice_owner_name = (data.get("owner_name") or "")[:255]
            sub.transport_type_on_invoice = _map_ai_transport(
                data.get("transport_type") or ""
            )
        else:
            sub.ai_extracted_data = {}
            sub.rejection_reasons = ["Fatura dosyası yok"]
            sub.status = "rejected"
            sub.validated_at = timezone.now()
            sub.save()
            rejected += 1
            NotificationService().send_rejection(participant, sub.rejection_reasons)
            continue

        if participant.transport_type == "plane":
            sub.rejection_reasons = ["Uçak bileti seçilmiş — bilet yükleme yapılmaz"]
            sub.status = "rejected"
            sub.validated_at = timezone.now()
            sub.save()
            rejected += 1
            NotificationService().send_rejection(participant, sub.rejection_reasons)
            continue

        vr = engine.validate(sub, participant, competition)
        sub.rejection_reasons = vr["errors"]
        sub.status = "approved" if vr["approved"] else "rejected"
        sub.validated_at = timezone.now()
        sub.is_duplicate = any("Mükerrer" in e for e in (vr["errors"] or []))
        sub.save()

        if vr["approved"]:
            approved += 1
            if sub.invoice_amount:
                total_amount += sub.invoice_amount
            NotificationService().send_approval(participant, session)
        else:
            rejected += 1
            NotificationService().send_rejection(participant, vr["errors"])

    session.summary = {
        "total": len(submissions),
        "approved": approved,
        "rejected": rejected,
        "total_amount": str(total_amount),
    }
    session.status = "completed"
    session.completed_at = timezone.now()
    session.save(update_fields=["summary", "status", "completed_at"])
