from django.conf import settings
from django.db import models


class ModuleConfig(models.Model):
    name = models.CharField(max_length=100, unique=True)
    display_name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=False)
    config = models.JSONField(default=dict)
    version = models.CharField(max_length=20, default="1.0.0")
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        from core.module_registry import ModuleRegistry

        module = ModuleRegistry._modules.get(self.name)
        if module:
            if self.is_active:
                module.on_enable()
            else:
                module.on_disable()
