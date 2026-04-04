import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ("superadmin", "Süper Admin"),
        ("admin", "Admin"),
        ("operator", "Operatör"),
        ("viewer", "İzleyici"),
        ("captain", "Kaptan"),
        ("participant", "Katılımcı"),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="viewer")
    preferred_language = models.CharField(max_length=10, default="tr")
    created_at = models.DateTimeField(auto_now_add=True)

    def is_superadmin(self):
        return self.role == "superadmin"

    def is_operator(self):
        return self.role in ("superadmin", "operator", "admin")

    def is_captain_role(self):
        return self.role == "captain"


class MagicLink(models.Model):
    user = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, related_name="magic_links"
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user_id} — {self.token}"
