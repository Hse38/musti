from django.db import models


class Competition(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    start_date = models.DateField()
    end_date = models.DateField()
    max_supported_members = models.IntegerField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Team(models.Model):
    competition = models.ForeignKey(
        Competition, on_delete=models.CASCADE, related_name="teams"
    )
    name = models.CharField(max_length=255)
    team_code = models.CharField(max_length=50, unique=True)
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
    full_name = models.CharField(max_length=255)
    tc_id = models.CharField(max_length=11)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True, default="")
    transport_type = models.CharField(max_length=20, choices=TRANSPORT_CHOICES)
    is_supported = models.BooleanField(default=False)
    iban = models.CharField(max_length=34, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    account_holder_name = models.CharField(max_length=255, blank=True)
    kys_id = models.CharField(max_length=100, blank=True)
    city_from = models.CharField(max_length=100, blank=True, default="")
    city_to = models.CharField(max_length=100, blank=True, default="")
    kys_member_id = models.CharField(max_length=50, blank=True, default="")

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return self.full_name
