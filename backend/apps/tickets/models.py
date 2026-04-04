import uuid

from django.conf import settings
from django.db import models


class AnalysisSession(models.Model):
    STATUS_CHOICES = [
        ("pending", "Bekliyor"),
        ("processing", "İşleniyor"),
        ("completed", "Tamamlandı"),
        ("failed", "Hata"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    competition = models.ForeignKey(
        "competitions.Competition", on_delete=models.SET_NULL, null=True, blank=True
    )
    transport_request_file = models.FileField(upload_to="sessions/")
    ticket_payment_file = models.FileField(upload_to="sessions/")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    summary = models.JSONField(default=dict)
    error_message = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-created_at"]


class TicketSubmission(models.Model):
    STATUS_CHOICES = [("approved", "Onaylandı"), ("rejected", "Reddedildi")]
    session = models.ForeignKey(
        AnalysisSession, on_delete=models.CASCADE, related_name="submissions"
    )
    participant = models.ForeignKey("competitions.Participant", on_delete=models.CASCADE)
    invoice_file = models.FileField(upload_to="invoices/", null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="rejected")
    rejection_reasons = models.JSONField(default=list)
    invoice_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    invoice_date = models.DateField(null=True, blank=True)
    invoice_owner_name = models.CharField(max_length=255, blank=True)
    transport_type_on_invoice = models.CharField(max_length=50, blank=True)
    is_duplicate = models.BooleanField(default=False)
    ai_extracted_data = models.JSONField(default=dict)
    validated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["id"]
