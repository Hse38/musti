from io import BytesIO

import openpyxl
from openpyxl.styles import Font, PatternFill


class ReportGenerator:
    GREEN = PatternFill("solid", fgColor="C6EFCE")
    RED = PatternFill("solid", fgColor="FFC7CE")

    def generate_result_report(self, session, template=None) -> bytes:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Sonuç Raporu"

        columns = self._get_columns("result", template)
        ws.append([col["label"] for col in columns])
        self._style_header(ws)

        for sub in session.submissions.select_related("participant__team"):
            row = self._build_row(sub, columns)
            ws.append(row)
            fill = self.GREEN if sub.status == "approved" else self.RED
            for cell in ws[ws.max_row]:
                cell.fill = fill

        return self._to_bytes(wb)

    def generate_payment_report(self, session, template=None) -> bytes:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Ödeme Raporu"

        approved = session.submissions.filter(status="approved").select_related(
            "participant", "session__competition"
        )
        columns = self._get_columns("payment", template)
        ws.append([col["label"] for col in columns])
        self._style_header(ws)

        comp_name = (
            session.competition.name if session.competition else "TEKNOFEST"
        )
        for sub in approved:
            p = sub.participant
            row_data = {
                "account_holder_name": p.account_holder_name,
                "tc_id": p.tc_id,
                "bank_name": p.bank_name,
                "iban": p.iban,
                "amount": float(sub.invoice_amount or 0),
                "description": f"{comp_name} ulaşım desteği",
            }
            ws.append([row_data.get(col["key"], "") for col in columns])

        return self._to_bytes(wb)

    def _build_row(self, sub, columns):
        p = sub.participant
        team = p.team.name if p.team else ""
        transport = p.get_transport_type_display() if hasattr(
            p, "get_transport_type_display"
        ) else p.transport_type
        errors = "\n".join(sub.rejection_reasons or [])
        base = {
            "full_name": p.full_name,
            "tc_id": p.tc_id,
            "team": team,
            "transport_type": transport,
            "status": "Onaylı" if sub.status == "approved" else "Reddedildi",
            "errors": errors,
            "amount": float(sub.invoice_amount) if sub.invoice_amount is not None else "",
        }
        return [base.get(col["key"], "") for col in columns]

    def _get_columns(self, report_type, template):
        if template and template.columns:
            cols = template.columns
            if isinstance(cols, list) and cols and "order" in cols[0]:
                return sorted(cols, key=lambda x: x.get("order", 0))
            return cols
        defaults = {
            "result": [
                {"key": "full_name", "label": "Katılımcı Adı", "order": 1},
                {"key": "tc_id", "label": "TC Kimlik", "order": 2},
                {"key": "team", "label": "Takım", "order": 3},
                {"key": "transport_type", "label": "Ulaşım Tipi", "order": 4},
                {"key": "status", "label": "Durum", "order": 5},
                {"key": "errors", "label": "Hatalar", "order": 6},
                {"key": "amount", "label": "Tutar", "order": 7},
            ],
            "payment": [
                {"key": "account_holder_name", "label": "Hesap Sahibi", "order": 1},
                {"key": "tc_id", "label": "TC Kimlik No", "order": 2},
                {"key": "bank_name", "label": "Banka Adı", "order": 3},
                {"key": "iban", "label": "IBAN", "order": 4},
                {"key": "amount", "label": "Tutar (TL)", "order": 5},
                {"key": "description", "label": "Açıklama", "order": 6},
            ],
        }
        return sorted(defaults[report_type], key=lambda x: x["order"])

    def _style_header(self, ws):
        bold = Font(bold=True)
        gray = PatternFill("solid", fgColor="D9D9D9")
        for cell in ws[1]:
            cell.font = bold
            cell.fill = gray

    def _to_bytes(self, wb) -> bytes:
        buf = BytesIO()
        wb.save(buf)
        return buf.getvalue()
