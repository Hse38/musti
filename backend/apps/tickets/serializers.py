from rest_framework import serializers

from apps.competitions.models import Competition

from .models import AnalysisSession, TicketSubmission


class TicketSubmissionSerializer(serializers.ModelSerializer):
    participant_name = serializers.CharField(source="participant.full_name", read_only=True)
    participant_tc = serializers.CharField(source="participant.tc_id", read_only=True)

    class Meta:
        model = TicketSubmission
        fields = (
            "id",
            "participant",
            "participant_name",
            "participant_tc",
            "status",
            "rejection_reasons",
            "invoice_amount",
            "invoice_date",
            "invoice_owner_name",
            "transport_type_on_invoice",
            "is_duplicate",
            "ai_extracted_data",
            "validated_at",
        )


class AnalysisSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisSession
        fields = (
            "id",
            "competition",
            "status",
            "summary",
            "created_at",
            "completed_at",
            "error_message",
        )


class SessionCreateSerializer(serializers.Serializer):
    competition_id = serializers.PrimaryKeyRelatedField(
        queryset=Competition.objects.filter(is_active=True)
    )
    team_code = serializers.CharField(max_length=50)
    transport_request_file = serializers.FileField()
    ticket_payment_file = serializers.FileField()
