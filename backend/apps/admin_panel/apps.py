import logging

from django.apps import AppConfig
from django.db.models.signals import post_migrate

logger = logging.getLogger(__name__)


def _run_seed_after_migrate(sender, **kwargs):
    try:
        from apps.admin_panel.seed_logic import apply_seed

        apply_seed()
    except Exception:
        logger.exception("post_migrate seed başarısız")


class AdminPanelConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.admin_panel"
    label = "admin_panel"

    def ready(self):
        # Modül sınıflarını yükle — decorator kayıtlarını tetikler
        try:
            import apps.kys.module  # noqa: F401
            import apps.notifications.module  # noqa: F401
        except Exception:
            pass

        post_migrate.connect(
            _run_seed_after_migrate,
            sender=self,
            dispatch_uid="admin_panel.post_migrate_seed",
        )
