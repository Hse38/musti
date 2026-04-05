import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Railway / ilk kurulum: admin süper kullanıcı yoksa oluşturur (SEED_ADMIN_PASSWORD veya varsayılan)."

    def handle(self, *args, **kwargs):
        User = get_user_model()
        password = os.environ.get("SEED_ADMIN_PASSWORD", "admin123")
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser(
                username="admin",
                email="admin@teknofest.org",
                password=password,
                role="superadmin",
            )
            self.stdout.write(self.style.SUCCESS("Admin created"))
        else:
            self.stdout.write("Admin already exists")
