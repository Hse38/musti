import os

from django.db import migrations


def create_admin(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    if User.objects.filter(username="admin").exists():
        return
    password = os.environ.get("SEED_ADMIN_PASSWORD", "admin123")
    user = User(
        username="admin",
        email="admin@teknofest.org",
        is_staff=True,
        is_superuser=True,
        is_active=True,
        role="superadmin",
    )
    user.set_password(password)
    user.save()


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_user_preferred_language_alter_user_role_magiclink"),
    ]

    operations = [
        migrations.RunPython(create_admin, migrations.RunPython.noop),
    ]
