"""Katılımcı için JWT kullanıcısı oluşturma / bağlama."""

from django.contrib.auth import get_user_model
from django.utils.text import slugify

from apps.competitions.models import Participant

User = get_user_model()


def ensure_user_for_participant(participant: Participant):
    """Participant.user yoksa benzersiz username ile User oluşturur ve bağlar."""
    if participant.user_id:
        return participant.user
    base = slugify(participant.email or participant.full_name or "user")[:60] or "user"
    username = f"{base}-p{participant.pk}"[:150]
    user, _ = User.objects.get_or_create(
        username=username,
        defaults={
            "email": (participant.email or f"{username}@participant.local")[:254],
            "first_name": (participant.full_name or "")[:150],
            "role": "captain" if participant.is_captain else "participant",
            "is_active": True,
        },
    )
    if participant.email and user.email.endswith("@participant.local"):
        user.email = participant.email[:254]
        user.save(update_fields=["email"])
    participant.user = user
    participant.save(update_fields=["user"])
    return user
