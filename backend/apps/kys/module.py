from core.base_module import BaseModule
from core.module_registry import ModuleRegistry


@ModuleRegistry.register
class KYSModule(BaseModule):
    name = "kys"
    display_name = "T3 KYS Entegrasyonu"
    description = "TEKNOFEST Katılımcı Yönetim Sistemi ile senkronizasyon"
    version = "1.0.0"

    def on_enable(self):
        pass

    def on_disable(self):
        pass

    def get_config_schema(self):
        return {
            "api_url": {"type": "string", "label": "KYS API URL"},
            "api_key": {"type": "password", "label": "API Anahtarı"},
            "sync_interval_minutes": {
                "type": "number",
                "label": "Senkronizasyon Aralığı (dk)",
                "default": 60,
            },
        }
