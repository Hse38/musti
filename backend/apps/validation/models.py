from django.conf import settings
from django.db import models


class ValidationRule(models.Model):
    CATEGORY_CHOICES = [
        ("basic", "Temel Kontrol"),
        ("invoice", "Fatura Kontrolü"),
        ("iban", "IBAN Kontrolü"),
        ("duplicate", "Mükerrer Kontrolü"),
    ]
    name = models.CharField(max_length=100, unique=True)
    display_name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    is_active = models.BooleanField(default=True)
    priority = models.IntegerField(default=100)
    is_blocking = models.BooleanField(default=True)
    config = models.JSONField(default=dict)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["priority", "id"]


class ReportTemplate(models.Model):
    REPORT_TYPE_CHOICES = [("result", "Sonuç"), ("payment", "Ödeme")]
    name = models.CharField(max_length=100)
    report_type = models.CharField(max_length=20, choices=REPORT_TYPE_CHOICES)
    columns = models.JSONField()
    is_default = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        ordering = ["report_type", "name"]
