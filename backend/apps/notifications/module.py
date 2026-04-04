from core.base_module import BaseModule
from core.module_registry import ModuleRegistry


@ModuleRegistry.register
class NotificationModule(BaseModule):
    name = "notifications"
    display_name = "E-posta Bildirimleri"
    description = "Onay/red durumunu katılımcılara e-posta ile bildirir"
    version = "1.0.0"

    def on_enable(self):
        pass

    def on_disable(self):
        pass

    def get_config_schema(self):
        return {
            "smtp_host": {"type": "string", "label": "SMTP Sunucusu"},
            "smtp_port": {"type": "number", "label": "Port", "default": 587},
            "sender_email": {"type": "string", "label": "Gönderen E-posta"},
            "sender_name": {
                "type": "string",
                "label": "Gönderen Adı",
                "default": "TEKNOFEST",
            },
        }
