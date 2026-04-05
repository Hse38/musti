import logging
import tempfile
from datetime import datetime

from django.db import DatabaseError
from rest_framework import generics
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.audit.utils import write_audit
from core.permissions import IsOperator

from .import_service import launch_competition_from_xlsx
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


class CompetitionLaunchView(APIView):
    """
    POST /api/v1/admin/competitions/launch/
    XLSX + tarih pencereleri + destek kotası → yarışma, takımlar, katılımcılar (e-posta yok).
    Magic link mailleri: POST /api/v1/admin/competitions/{id}/send-magic-links/
    """

    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsOperator]

    def post(self, request):
        f = request.FILES.get("file")
        if not f:
            return Response({"detail": "XLSX dosyası gerekli."}, status=400)

        try:
            max_sup = int(request.data.get("max_supported_members") or 0)
        except (TypeError, ValueError):
            max_sup = 0
        if max_sup < 1:
            return Response(
                {"detail": "Desteklenecek kişi sayısı 1 veya daha büyük olmalı."},
                status=400,
            )

        def pdate(key):
            v = request.data.get(key)
            if v is None or v == "":
                return None
            if hasattr(v, "year"):
                return v
            return datetime.strptime(str(v).strip()[:10], "%Y-%m-%d").date()

        ae, al, de, dl = (
            pdate("arrival_earliest"),
            pdate("arrival_latest"),
            pdate("departure_earliest"),
            pdate("departure_latest"),
        )
        if None in (ae, al, de, dl):
            return Response(
                {"detail": "Dört tarih alanı da gerekli (YYYY-MM-DD)."},
                status=400,
            )

        path = f.temporary_file_path() if hasattr(f, "temporary_file_path") else None
        if not path:
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx")
            for chunk in f.chunks():
                tmp.write(chunk)
            tmp.close()
            path = tmp.name

        try:
            out = launch_competition_from_xlsx(
                path,
                max_supported_members=max_sup,
                arrival_earliest=ae,
                arrival_latest=al,
                departure_earliest=de,
                departure_latest=dl,
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=400)

        write_audit(
            request.user,
            "competition.launch_xlsx",
            "Competition",
            str(out["competition_id"]),
            None,
            out,
            request.META.get("REMOTE_ADDR"),
        )

        payload = {
            **out,
            "message": (
                f"Yarışma oluşturuldu: {out['teams_added']} takım, "
                f"{out['participants_added']} katılımcı. "
                "Sihirli link e-postaları için yarışma sayfasından 'Sihirli linkleri gönder' düğmesini kullanın."
            ),
        }
        return Response(payload, status=201)
