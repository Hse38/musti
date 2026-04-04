from rest_framework.response import Response
from rest_framework.views import APIView

from core.module_registry import ModuleRegistry
from core.permissions import IsOperator

from .client import KYSClient


class KYSParticipantsView(APIView):
    permission_classes = [IsOperator]

    def get(self, request):
        if not ModuleRegistry.is_active("kys"):
            return Response({"detail": "KYS modülü kapalı."}, status=400)
        team_code = request.query_params.get("team_code", "")
        data = KYSClient().get_team_participants(team_code)
        return Response({"results": data})


class KYSSyncView(APIView):
    permission_classes = [IsOperator]

    def post(self, request):
        if not ModuleRegistry.is_active("kys"):
            return Response({"detail": "KYS modülü kapalı."}, status=400)
        return Response({"ok": True, "synced": 0, "message": "Stub — KYS bağlantısı yapılandırılınca doldurulur."})
