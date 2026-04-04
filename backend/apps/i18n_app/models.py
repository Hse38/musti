from django.db import models


class Language(models.Model):
    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=50)
    native_name = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    is_rtl = models.BooleanField(default=False)
    flag_emoji = models.CharField(max_length=10, blank=True)


class Translation(models.Model):
    language = models.ForeignKey(
        Language, on_delete=models.CASCADE, related_name="translations"
    )
    key = models.CharField(max_length=255)
    value = models.TextField()
    auto_translated = models.BooleanField(default=False)

    class Meta:
        unique_together = [("language", "key")]
