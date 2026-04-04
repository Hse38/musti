from rest_framework import serializers

from apps.competitions.models import Competition

from .models import AnalysisSession, TicketSubmission


class TicketSubmissionSerializer(serializers.ModelSerializer):
    participant_name = serializers.SerializerMethodField()
    participant_tc = serializers.SerializerMethodField()

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
            "invoice_drive_link",
            "basvuru_id",
            "account_holder_tc",
        )

    def get_participant_name(self, obj):
        if obj.participant_id:
            return obj.participant.full_name
        snap = obj.payment_form_snapshot or {}
        return snap.get("full_name") or ""

    def get_participant_tc(self, obj):
        if obj.participant_id:
            return obj.participant.tc_id
        snap = obj.payment_form_snapshot or {}
        return snap.get("tc_id") or ""


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
            "supported_quota_override",
        )


class SessionCreateSerializer(serializers.Serializer):
    competition_id = serializers.PrimaryKeyRelatedField(
        queryset=Competition.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    manual_competition_name = serializers.CharField(
        max_length=255, required=False, allow_blank=True
    )
    supported_count = serializers.IntegerField(
        required=False, min_value=1, max_value=50000
    )
    transport_request_file = serializers.FileField()
    ticket_payment_file = serializers.FileField()

    def validate(self, attrs):
        cid = attrs.get("competition_id")
        man = (attrs.get("manual_competition_name") or "").strip()
        if not cid and not man:
            raise serializers.ValidationError(
                "Yarışma seçin veya manuel yarışma adı girin."
            )
        return attrs
