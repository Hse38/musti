from rest_framework import serializers

from .models import Competition


class CompetitionPublicSerializer(serializers.ModelSerializer):
    """Sadece halka açık liste alanları — şema değişse bile API çıktısı sabit kalır."""

    class Meta:
        model = Competition
        fields = ("id", "name", "slug")
