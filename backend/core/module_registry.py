class ModuleRegistry:
    """
    Tüm modüllerin merkezi kayıt defteri.
    DB'deki Module tablosu ile senkronize çalışır.
    """

    _modules: dict = {}

    @classmethod
    def register(cls, module_class):
        """Decorator olarak kullanılır: @ModuleRegistry.register"""
        instance = module_class()
        cls._modules[instance.name] = instance
        return module_class

    @classmethod
    def is_active(cls, module_name: str) -> bool:
        from apps.admin_panel.models import ModuleConfig

        try:
            config = ModuleConfig.objects.get(name=module_name)
            return config.is_active
        except ModuleConfig.DoesNotExist:
            return False

    @classmethod
    def get_active_modules(cls) -> list:
        return [m for name, m in cls._modules.items() if cls.is_active(name)]

    @classmethod
    def get_all(cls) -> dict:
        return cls._modules
