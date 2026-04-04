import threading
from datetime import date

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils.text import slugify
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.competitions.models import Competition
from apps.reports.generator import ReportGenerator
from apps.validation.models import ReportTemplate

from .models import AnalysisSession, TicketSubmission
from .serializers import (
    AnalysisSessionSerializer,
    SessionCreateSerializer,
    TicketSubmissionSerializer,
)
from .services import run_session_analysis


class AnalysisSessionListCreateView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        ser = SessionCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        vd = ser.validated_data

        if (vd.get("manual_competition_name") or "").strip():
            name = vd["manual_competition_name"].strip()
            slug = slugify(name)[:50] or "yarisma"
            max_m = vd.get("supported_count") or 5
            competition, _ = Competition.objects.get_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "start_date": date(2025, 1, 1),
                    "end_date": date(2025, 12, 31),
                    "max_supported_members": max_m,
                    "is_active": True,
                },
            )
        else:
            competition = vd["competition_id"]

        override = vd.get("supported_count")

        session = AnalysisSession.objects.create(
            competition=competition,
            transport_request_file=vd["transport_request_file"],
            ticket_payment_file=vd["ticket_payment_file"],
            supported_quota_override=override,
            created_by=request.user if request.user.is_authenticated else None,
        )

        for f in request.FILES.getlist("invoices"):
            TicketSubmission.objects.create(session=session, invoice_file=f)

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
