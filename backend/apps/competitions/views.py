import logging

from django.db import DatabaseError
from rest_framework import generics
from rest_framework.response import Response

from .models import Competition
from .serializers import CompetitionPublicSerializer

logger = logging.getLogger(__name__)


class ActiveCompetitionListView(generics.ListAPIView):
    """Aktif yarışmalar — yalnızca id/name/slug (DB'de ek sütun eksik olsa bile SELECT daraltılır)."""

    authentication_classes = []
    permission_classes = []
    serializer_class = CompetitionPublicSerializer

    def get_queryset(self):
        return (
            Competition.objects.filter(is_active=True)
            .only("id", "name", "slug")
            .order_by("name")
        )

    def list(self, request, *args, **kwargs):
        try:
            return super().list(request, *args, **kwargs)
        except DatabaseError:
            logger.exception("ActiveCompetitionListView database error")
            return Response(
                {"detail": "Yarışma listesi alınamadı. Veritabanı şeması güncel mi (migrate)?"},
                status=503,
            )
