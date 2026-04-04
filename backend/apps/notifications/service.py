from django.conf import settings
from django.core.mail import send_mail

from core.module_registry import ModuleRegistry


class NotificationService:
    def send_approval(self, participant, session):
        if not ModuleRegistry.is_active("notifications"):
            return
        if not participant.email:
            return
        subject = "Ulaşım Desteği Başvurunuz Onaylandı"
        body = f"Sayın {participant.full_name}, başvurunuz onaylandı."
        self._send(participant.email, subject, body)

    def send_rejection(self, participant, reasons: list):
        if not ModuleRegistry.is_active("notifications"):
            return
        if not participant.email:
            return
        subject = "Ulaşım Desteği Başvurunuz Reddedildi"
        lines = "\n".join(f"- {r}" for r in (reasons or []))
        body = f"Sayın {participant.full_name}, başvurunuz reddedildi.\nNedenler:\n{lines}"
        self._send(participant.email, subject, body)

    def _send(self, to, subject, body):
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to], fail_silently=True)
