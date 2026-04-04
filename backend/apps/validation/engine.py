from apps.tickets.models import TicketSubmission
from apps.validation.models import ValidationRule


class ValidationEngine:
    def __init__(self):
        self.rules = ValidationRule.objects.filter(is_active=True).order_by("priority")

    def validate(self, submission, participant, competition) -> dict:
        errors = []
        blocked = False

        for rule in self.rules:
            if blocked:
                break
            handler = getattr(self, f"_rule_{rule.name}", None)
            if not handler:
                continue
            result = handler(submission, participant, competition, rule.config)
            if not result["passed"]:
                errors.append(result["message"])
                if rule.is_blocking:
                    blocked = True

        return {"approved": len(errors) == 0, "errors": errors}

    def _rule_check_support_scope(self, submission, participant, competition, config):
        if not participant.is_supported:
            return {"passed": False, "message": "Katılımcı destek kapsamında değil"}
        return {"passed": True}

    def _rule_check_plane_selected(self, submission, participant, competition, config):
        if participant.transport_type == "plane":
            return {
                "passed": False,
                "message": "Uçak bileti seçilmiş — bilet yükleme yapılmaz",
            }
        return {"passed": True}

    def _rule_check_transport_type(self, submission, participant, competition, config):
        allowed = config.get("allowed_types", ["bus", "train", "other"])
        if participant.transport_type not in allowed:
            return {
                "passed": False,
                "message": f"Yalnızca {', '.join(allowed)} kabul edilir",
            }
        return {"passed": True}

    def _rule_check_transport_match(self, submission, participant, competition, config):
        if (
            submission.transport_type_on_invoice
            and submission.transport_type_on_invoice != participant.transport_type
        ):
            return {
                "passed": False,
                "message": "Faturadaki ulaşım türü talep ile uyuşmuyor",
            }
        return {"passed": True}

    def _rule_check_amount_validity(self, submission, participant, competition, config):
        if submission.invoice_amount is None or submission.invoice_amount <= 0:
            return {
                "passed": False,
                "message": "Fatura tutarı geçersiz (0 veya negatif olamaz)",
            }
        return {"passed": True}

    def _rule_check_invoice_owner(self, submission, participant, competition, config):
        if submission.invoice_drive_link and not submission.invoice_file:
            return {"passed": True}
        if not submission.invoice_owner_name:
            return {"passed": False, "message": "Fatura sahibi bilgisi okunamadı"}
        parts = participant.full_name.split()
        participant_surname = parts[-1].lower() if parts else ""
        owner_name = submission.invoice_owner_name.lower()
        full_lower = participant.full_name.lower()
        if full_lower not in owner_name and participant_surname not in owner_name:
            return {"passed": False, "message": "Fatura doğru kişiye ait değil"}
        return {"passed": True}

    def _rule_check_invoice_date(self, submission, participant, competition, config):
        if submission.invoice_drive_link and not submission.invoice_file:
            return {"passed": True}
        if not submission.invoice_date:
            return {"passed": False, "message": "Fatura tarihi okunamadı"}
        if competition and not (
            competition.start_date <= submission.invoice_date <= competition.end_date
        ):
            return {
                "passed": False,
                "message": (
                    f"Fatura tarihi yarışma dışında "
                    f"({competition.start_date} / {competition.end_date})"
                ),
            }
        return {"passed": True}

    def _rule_check_duplicate(self, submission, participant, competition, config):
        if participant is None:
            return {"passed": True}
        duplicate = TicketSubmission.objects.filter(
            participant=participant,
            invoice_date=submission.invoice_date,
            invoice_amount=submission.invoice_amount,
            status="approved",
        ).exclude(pk=submission.pk).exists()
        if duplicate:
            return {"passed": False, "message": "Mükerrer başvuru tespit edildi"}
        return {"passed": True}

    def _rule_check_iban(self, submission, participant, competition, config):
        digital_wallets = config.get(
            "blocked_banks",
            ["papara", "tosla", "paycell", "ininal", "hayat finans", "param"],
        )
        bank_lower = (participant.bank_name or "").lower()
        if any(kw in bank_lower for kw in digital_wallets):
            return {
                "passed": False,
                "message": f"IBAN dijital cüzdana ait olamaz ({participant.bank_name})",
            }
        if participant.iban:
            if not participant.iban.upper().startswith("TR"):
                return {"passed": False, "message": "IBAN TR ile başlamalıdır"}

        account_holder = (participant.account_holder_name or "").lower().strip()
        if not account_holder:
            return {"passed": False, "message": "Hesap sahibi adı boş"}

        participant_name = participant.full_name.lower().strip()
        participant_surname = participant_name.split()[-1] if participant_name else ""

        if participant_name in account_holder or account_holder in participant_name:
            return {"passed": True}

        if participant_surname and participant_surname in account_holder:
            return {"passed": True}

        return {
            "passed": False,
            "message": (
                f"IBAN sahibi ({participant.account_holder_name}) katılımcı adı veya "
                f"soyadıyla eşleşmiyor"
            ),
        }
