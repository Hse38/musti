from django.apps import AppConfig


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
