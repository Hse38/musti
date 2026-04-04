from django.conf import settings
from django.db import models


class SiteSettings(models.Model):
    """Tekil site ayarları — pk=1."""

    site_name = models.CharField(
        max_length=100, default="TEKNOFEST Ulaşım Sistemi"
    )
    logo = models.ImageField(upload_to="branding/", null=True, blank=True)
    favicon = models.ImageField(upload_to="branding/", null=True, blank=True)
    primary_color = models.CharField(max_length=7, default="#2563EB")
    secondary_color = models.CharField(max_length=7, default="#7C3AED")
    support_email = models.EmailField(blank=True)
    support_phone = models.CharField(max_length=20, blank=True)
    smtp_host = models.CharField(max_length=200, blank=True)
    smtp_port = models.IntegerField(default=587)
    smtp_user = models.CharField(max_length=200, blank=True)
    smtp_password = models.CharField(max_length=200, blank=True)
    email_from_name = models.CharField(max_length=100, default="TEKNOFEST")
    magic_link_subject = models.CharField(
        max_length=200, default="TEKNOFEST - Giriş Linki"
    )
    magic_link_body = models.TextField(
        default="Merhaba {name},\n\nGiriş: {link}"
    )
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


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
