"""SiteSettings üzerinden SMTP ile e-posta gönderimi."""

from __future__ import annotations

import logging
from typing import Sequence

from django.conf import settings
from django.core.mail import EmailMessage, get_connection

from apps.admin_panel.models import SiteSettings

logger = logging.getLogger(__name__)


def send_mail_via_site_settings(
    subject: str,
    body: str,
    to_emails: Sequence[str],
    *,
    fail_silently: bool = True,
) -> bool:
    _ = fail_silently  # API uyumluluğu; gönderim hatalarında exception yükseltilmez
    s = SiteSettings.load()
    recipients = [e for e in to_emails if e and "@" in e]
    if not recipients:
        return False
    from_email = s.support_email or settings.DEFAULT_FROM_EMAIL

    if not s.smtp_host:
        try:
            from django.core.mail import send_mail

            send_mail(
                subject,
                body,
                from_email,
                list(recipients),
                fail_silently=False,
            )
            return True
        except Exception as e:
            logger.warning("send_mail (console/default) failed: %s", e, exc_info=True)
            return False

    try:
        conn = get_connection(
            backend="django.core.mail.backends.smtp.EmailBackend",
            host=s.smtp_host,
            port=s.smtp_port or 587,
            username=s.smtp_user or "",
            password=s.smtp_password or "",
            use_tls=s.smtp_use_tls,
        )
        msg = EmailMessage(
            subject=subject,
            body=body,
            from_email=f"{s.email_from_name} <{from_email}>" if s.email_from_name else from_email,
            to=list(recipients),
            connection=conn,
        )
        msg.send(fail_silently=True)
        return True
    except Exception as e:
        logger.warning("SMTP send failed: %s", e, exc_info=True)
        return False
