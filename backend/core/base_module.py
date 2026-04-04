from abc import ABC, abstractmethod


class BaseModule(ABC):
    """
    Tüm plug-in modüllerin extend edeceği base class.
    Yeni modül eklemek için bu class'ı extend et ve
    ModuleRegistry'e kaydet. Başka hiçbir şeyi değiştirme.
    """

    name: str = ""
    display_name: str = ""
    description: str = ""
    version: str = "1.0.0"

    @abstractmethod
    def on_enable(self):
        """Modül aktif edildiğinde çalışır."""
        pass

    @abstractmethod
    def on_disable(self):
        """Modül devre dışı bırakıldığında çalışır."""
        pass

    def get_config_schema(self) -> dict:
        """Admin panelde gösterilecek config alanları."""
        return {}

    def health_check(self) -> dict:
        """Modülün sağlık durumunu döner."""
        return {"status": "ok"}
