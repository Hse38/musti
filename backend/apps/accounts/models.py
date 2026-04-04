from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ("superadmin", "Süper Admin"),
        ("operator", "Operatör"),
        ("viewer", "İzleyici"),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="viewer")
    created_at = models.DateTimeField(auto_now_add=True)

    def is_superadmin(self):
        return self.role == "superadmin"

    def is_operator(self):
        return self.role in ["superadmin", "operator"]
