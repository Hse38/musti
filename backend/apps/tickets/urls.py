from django.urls import path

from . import views

urlpatterns = [
    path("", views.AnalysisSessionListCreateView.as_view(), name="session-list-create"),
    path("<uuid:session_id>/", views.AnalysisSessionDetailView.as_view(), name="session-detail"),
    path(
        "<uuid:session_id>/submissions/",
        views.SubmissionListView.as_view(),
        name="session-submissions",
    ),
    path(
        "<uuid:session_id>/report/result/",
        views.SessionReportView.as_view(),
        {"report_kind": "result"},
        name="session-report-result",
    ),
    path(
        "<uuid:session_id>/report/payment/",
        views.SessionReportView.as_view(),
        {"report_kind": "payment"},
        name="session-report-payment",
    ),
]
