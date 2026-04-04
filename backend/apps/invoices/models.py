from django.conf import settings
from django.db import models


class Invoice(models.Model):
    STATUS_CHOICES = [
        ("pending", "Bekliyor"),
        ("manual_review", "Manuel inceleme"),
        ("approved", "Onaylandı"),
        ("rejected", "Reddedildi"),
    ]

    transport_request = models.ForeignKey(
        "transport.TransportRequest",
        on_delete=models.CASCADE,
        related_name="invoices",
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    file = models.FileField(upload_to="invoices/%Y/%m/")
    ai_extracted_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    ai_extracted_date = models.DateField(null=True, blank=True)
    ai_extracted_owner = models.CharField(max_length=255, blank=True)
    ai_extracted_transport_type = models.CharField(max_length=50, blank=True)
    ai_extracted_origin = models.CharField(max_length=100, blank=True)
    ai_extracted_destination = models.CharField(max_length=100, blank=True)
    ai_confidence = models.FloatField(null=True, blank=True)
    ai_raw_response = models.JSONField(default=dict)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="pending"
    )
    rejection_reasons = models.JSONField(default=list)
    validated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
