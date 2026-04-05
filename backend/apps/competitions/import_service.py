import hashlib

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify

from apps.accounts.models import MagicLink
from apps.admin_panel.models import SiteSettings
from apps.competitions.models import Competition, Participant, Team
from apps.competitions.xlsx_parser import ParticipantXLSXParser
from core.audit_log import log_action
from core.mail_utils import send_mail_via_site_settings
from core.participant_user import ensure_user_for_participant

User = get_user_model()


def _tc_placeholder(team_id: int, full_name: str, email: str) -> str:
    raw = f"{team_id}|{full_name}|{email}"
    h = hashlib.sha256(raw.encode()).hexdigest()
    digits = "".join(c for c in h if c.isdigit())
    if len(digits) < 11:
        digits = (digits + "123456789012345")[:11]
    return digits[:11]


def process_xlsx_upload(file_path: str, competition_id: int, *, actor=None):
    data = ParticipantXLSXParser().parse(file_path)
    competition = Competition.objects.get(pk=competition_id)
    settings_obj = SiteSettings.load()
    sent = 0
    frontend = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    deadline = competition.end_date.isoformat() if competition.end_date else ""

    for t in data.get("teams") or []:
        code_base = slugify(t["team_id"] or t["team_name"])[:40] or "takim"
        team_code = f"{code_base}-{competition.pk}"[:50]
        team, _ = Team.objects.update_or_create(
            team_code=team_code,
            defaults={
                "competition": competition,
                "name": t["team_name"][:255],
                "team_id": (t.get("team_id") or str(t["team_name"]))[:50],
            },
        )
        for p in t.get("participants") or []:
            email = (p.get("email") or "").strip()
            full_name = (p.get("full_name") or "").strip()[:255]
            if not full_name:
                continue
            uname_base = slugify(email or full_name)[:60] or "user"
            username = f"{uname_base}-{team.pk}"[:150]

            user, _ = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": email or f"{username}@import.local",
                    "first_name": full_name[:30],
                    "role": "captain" if p.get("is_captain") else "participant",
                    "is_active": True,
                },
            )
            if email:
                user.email = email
            if p.get("is_captain"):
                user.role = "captain"
            user.save()

            tc = _tc_placeholder(team.pk, full_name, email)
            participant, _ = Participant.objects.update_or_create(
                team=team,
                tc_id=tc,
                defaults={
                    "user": user,
                    "full_name": full_name,
                    "email": email,
                    "is_captain": bool(p.get("is_captain")),
                    "transport_type": "none",
                    "is_supported": True,
                },
            )
            ensure_user_for_participant(participant)
            participant.refresh_from_db()

            MagicLink.objects.filter(user=user, is_used=False).update(is_used=True)
            MagicLink.objects.filter(participant=participant, is_used=False).update(
                is_used=True
            )
            link = MagicLink.objects.create(
                user=participant.user,
                participant=participant,
                expires_at=timezone.now() + timedelta(hours=48),
            )
            magic_url = f"{frontend}/tr?magic_token={link.token}"
            body = settings_obj.magic_link_body.format(
                name=full_name,
                link=magic_url,
                competition=competition.name,
                deadline=deadline or "—",
            )
            if email and "@" in email:
                ok = send_mail_via_site_settings(
                    settings_obj.magic_link_subject,
                    body,
                    [email],
                    fail_silently=True,
                )
                if ok:
                    sent += 1
                    participant.magic_link_sent_at = timezone.now()
                    participant.save(update_fields=["magic_link_sent_at"])
                    log_action(
                        user=actor,
                        action="magic_link_email_sent",
                        target_type="participant",
                        target_id=participant.pk,
                        new_value={"email": email},
                    )

    return {"teams": len(data.get("teams") or []), "emails_sent": sent}
