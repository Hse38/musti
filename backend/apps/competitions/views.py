from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Competition


class ActiveCompetitionListView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        qs = Competition.objects.filter(is_active=True).order_by("name")
        return Response(
            [{"id": c.pk, "name": c.name, "slug": c.slug} for c in qs]
        )
