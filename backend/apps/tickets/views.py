import threading

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.competitions.models import Team
from apps.reports.generator import ReportGenerator
from apps.validation.models import ReportTemplate

from .models import AnalysisSession, TicketSubmission
from .serializers import (
    AnalysisSessionSerializer,
    SessionCreateSerializer,
    TicketSubmissionSerializer,
)
from .services import run_session_analysis


def _client_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class AnalysisSessionListCreateView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        ser = SessionCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        competition = ser.validated_data["competition_id"]
        team_code = ser.validated_data["team_code"].strip()
        team = Team.objects.filter(
            competition=competition, team_code__iexact=team_code
        ).first()
        if not team:
            return Response(
                {"detail": "Takım kodu bu yarışmada bulunamadı."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session = AnalysisSession.objects.create(
            competition=competition,
            transport_request_file=ser.validated_data["transport_request_file"],
            ticket_payment_file=ser.validated_data["ticket_payment_file"],
            created_by=request.user if request.user.is_authenticated else None,
        )

        from apps.competitions.models import Participant

        participants = sorted(
            Participant.objects.filter(team=team), key=lambda p: p.tc_id
        )
        files = request.FILES.getlist("invoices")
        for i, p in enumerate(participants):
            inv = files[i] if i < len(files) else None
            TicketSubmission.objects.create(
                session=session, participant=p, invoice_file=inv
            )

        def _bg(sid):
            run_session_analysis(sid)

        threading.Thread(target=_bg, args=(str(session.id),), daemon=True).start()

        return Response(
            AnalysisSessionSerializer(session).data, status=status.HTTP_201_CREATED
        )


class AnalysisSessionDetailView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, session_id):
        session = get_object_or_404(AnalysisSession, pk=session_id)
        return Response(AnalysisSessionSerializer(session).data)


class SubmissionListView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, session_id):
        session = get_object_or_404(AnalysisSession, pk=session_id)
        qs = session.submissions.select_related("participant")
        st = request.query_params.get("status")
        if st in ("approved", "rejected"):
            qs = qs.filter(status=st)
        return Response(TicketSubmissionSerializer(qs, many=True).data)


class SessionReportView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, session_id, report_kind):
        session = get_object_or_404(AnalysisSession, pk=session_id)
        rt = "result" if report_kind == "result" else "payment"
        template = ReportTemplate.objects.filter(
            report_type=rt, is_default=True
        ).first()
        gen = ReportGenerator()
        if rt == "result":
            data = gen.generate_result_report(session, template)
            name = "sonuc_raporu.xlsx"
        else:
            data = gen.generate_payment_report(session, template)
            name = "odeme_raporu.xlsx"
        resp = HttpResponse(
            data,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        resp["Content-Disposition"] = f'attachment; filename="{name}"'
        return resp
