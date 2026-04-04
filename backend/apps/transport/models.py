from django.db import models


class TransportRequest(models.Model):
    TRANSPORT_CHOICES = [
        ("plane", "Uçak"),
        ("bus", "Otobüs"),
        ("train", "Tren"),
        ("self", "Kendi İmkanımla"),
    ]
    STATUS_CHOICES = [
        ("pending", "Bekliyor"),
        ("info_collected", "Bilgiler alındı"),
        ("invoice_uploaded", "Fatura yüklendi"),
        ("approved", "Onaylandı"),
        ("rejected", "Reddedildi"),
        ("plane_confirmed", "Uçak bileti alındı"),
        ("self_noted", "Kendi imkanı"),
    ]

    participant = models.OneToOneField(
        "competitions.Participant",
        on_delete=models.CASCADE,
        related_name="transport_request",
    )
    transport_type = models.CharField(
        max_length=20, choices=TRANSPORT_CHOICES, default="bus"
    )
    preferred_arrival_date = models.DateField(null=True, blank=True)
    preferred_departure_date = models.DateField(null=True, blank=True)
    flight_notes = models.TextField(blank=True)
    origin_city = models.CharField(max_length=100, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    account_holder_name = models.CharField(max_length=255, blank=True)
    iban = models.CharField(max_length=34, blank=True)
    status = models.CharField(
        max_length=30, choices=STATUS_CHOICES, default="pending"
    )
    updated_at = models.DateTimeField(auto_now=True)
