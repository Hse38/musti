from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.admin_panel.models import ModuleConfig
from apps.competitions.models import Competition, Participant, Team
from apps.validation.models import ReportTemplate, ValidationRule

User = get_user_model()


class ValidationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ValidationRule
        fields = "__all__"


class ModuleConfigSerializer(serializers.ModelSerializer):
    config_schema = serializers.SerializerMethodField()

    class Meta:
        model = ModuleConfig
        fields = (
            "name",
            "display_name",
            "description",
            "is_active",
            "config",
            "version",
            "updated_at",
            "config_schema",
        )
        read_only_fields = ("display_name", "description", "version", "updated_at")

    def get_config_schema(self, obj):
        from core.module_registry import ModuleRegistry

        m = ModuleRegistry._modules.get(obj.name)
        return m.get_config_schema() if m else {}


class CompetitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Competition
        fields = "__all__"


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = "__all__"


class ParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Participant
        fields = "__all__"


class ReportTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportTemplate
        fields = "__all__"
        read_only_fields = ("created_by",)


class UserAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "role", "first_name", "last_name", "created_at")
