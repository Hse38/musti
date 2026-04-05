from django.db import models


class Competition(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    year = models.IntegerField(default=2025)
    start_date = models.DateField()
    end_date = models.DateField()
    arrival_earliest = models.DateField(null=True, blank=True)
    arrival_latest = models.DateField(null=True, blank=True)
    departure_earliest = models.DateField(null=True, blank=True)
    departure_latest = models.DateField(null=True, blank=True)
    max_supported_members = models.IntegerField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.arrival_earliest is None:
            self.arrival_earliest = self.start_date
        if self.arrival_latest is None:
            self.arrival_latest = self.end_date
        if self.departure_earliest is None:
            self.departure_earliest = self.start_date
        if self.departure_latest is None:
            self.departure_latest = self.end_date
        super().save(*args, **kwargs)


class Team(models.Model):
    competition = models.ForeignKey(
        Competition, on_delete=models.CASCADE, related_name="teams"
    )
    name = models.CharField(max_length=255)
    team_code = models.CharField(max_length=50, unique=True)
    team_id = models.CharField(max_length=50, blank=True, default="")
    supported_member_count = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.name} ({self.team_code})"


class Participant(models.Model):
    TRANSPORT_CHOICES = [
        ("plane", "Uçak"),
        ("bus", "Otobüs"),
        ("train", "Tren"),
        ("other", "Diğer"),
        ("none", "Talep Yok"),
    ]
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="participants")
    user = models.OneToOneField(
        "accounts.User",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="participant_profile",
    )
    full_name = models.CharField(max_length=255)
    tc_id = models.CharField(max_length=11)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True, default="")
    is_captain = models.BooleanField(default=False)
    transport_type = models.CharField(max_length=20, choices=TRANSPORT_CHOICES)
    is_supported = models.BooleanField(default=True)
    onboarding_completed = models.BooleanField(default=False)
    iban = models.CharField(max_length=34, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    account_holder_name = models.CharField(max_length=255, blank=True)
    kys_id = models.CharField(max_length=100, blank=True)
    city_from = models.CharField(max_length=100, blank=True, default="")
    city_to = models.CharField(max_length=100, blank=True, default="")
    kys_member_id = models.CharField(max_length=50, blank=True, default="")
    magic_link_sent_at = models.DateTimeField(null=True, blank=True)
    first_login_at = models.DateTimeField(null=True, blank=True)
    transport_selected_at = models.DateTimeField(null=True, blank=True)
    invoice_uploaded_at = models.DateTimeField(null=True, blank=True)
    last_activity_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.full_name
