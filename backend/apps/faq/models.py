from django.db import models


class FAQDocument(models.Model):
    competition = models.ForeignKey(
        "competitions.Competition",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to="faq/", null=True, blank=True)
    content = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)


class FAQConversation(models.Model):
    participant = models.ForeignKey(
        "competitions.Participant", on_delete=models.CASCADE
    )
    question = models.TextField()
    answer = models.TextField(blank=True)
    answered_by_ai = models.BooleanField(default=True)
    escalated_to_admin = models.BooleanField(default=False)
    admin_response = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
