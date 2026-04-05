from django.urls import path

from . import mega_views, views

urlpatterns = [
    path("dashboard/", views.AdminDashboardView.as_view(), name="admin-dashboard"),
    path("rules/", views.RuleListView.as_view(), name="admin-rules"),
    path("rules/categories/", views.RuleCategoriesView.as_view(), name="admin-rule-categories"),
    path("rules/<int:pk>/", views.RulePatchView.as_view(), name="admin-rule-patch"),
    path("modules/", views.ModuleListView.as_view(), name="admin-modules"),
    path("modules/<str:name>/", views.ModulePatchView.as_view(), name="admin-module-patch"),
    path("participants/", views.ParticipantsListView.as_view(), name="admin-participants-list"),
    path(
        "participants/<int:pk>/resend-link/",
        mega_views.ParticipantResendMagicView.as_view(),
        name="admin-participant-resend-link",
    ),
    path("competitions/", views.CompetitionListCreateView.as_view(), name="admin-competitions"),
    path(
        "competitions/launch/",
        mega_views.CompetitionLaunchFromXlsxView.as_view(),
        name="admin-competition-launch",
    ),
    path(
        "competitions/<int:pk>/",
        views.CompetitionDetailView.as_view(),
        name="admin-competition-detail",
    ),
    path(
        "competitions/<int:pk>/send-magic-links/",
        mega_views.CompetitionSendMagicLinksView.as_view(),
        name="admin-competition-send-magic",
    ),
    path(
        "competitions/<int:pk>/send-reminder/",
        mega_views.CompetitionSendReminderView.as_view(),
        name="admin-competition-send-reminder",
    ),
    path(
        "competitions/<int:competition_id>/teams/",
        views.TeamListCreateView.as_view(),
        name="admin-teams",
    ),
    path(
        "teams/<int:pk>/",
        views.TeamDetailView.as_view(),
        name="admin-team-detail",
    ),
    path(
        "teams/<int:team_id>/participants/",
        views.ParticipantListCreateView.as_view(),
        name="admin-participants",
    ),
    path(
        "participants/<int:pk>/",
        views.ParticipantDetailView.as_view(),
        name="admin-participant-detail",
    ),
    path(
        "report-templates/",
        views.ReportTemplateListCreateView.as_view(),
        name="admin-report-templates",
    ),
    path(
        "report-templates/<int:pk>/set-default/",
        views.ReportTemplateSetDefaultView.as_view(),
        name="admin-report-template-default",
    ),
    path("users/", views.UserListCreateView.as_view(), name="admin-users"),
    path(
        "users/<int:pk>/role/",
        views.UserRolePatchView.as_view(),
        name="admin-user-role",
    ),
    path("audit-logs/", views.AuditLogListView.as_view(), name="admin-audit"),
    path("settings/site/", mega_views.SiteSettingsView.as_view(), name="admin-site-settings"),
    path(
        "competitions/<int:pk>/upload-participants/",
        mega_views.CompetitionUploadParticipantsView.as_view(),
        name="admin-upload-participants",
    ),
    path("faq/documents/", mega_views.FAQDocumentListCreateView.as_view(), name="admin-faq-docs"),
    path(
        "faq/escalations/",
        mega_views.FAQEscalationListView.as_view(),
        name="admin-faq-escalations",
    ),
    path(
        "faq/escalations/<int:pk>/respond/",
        mega_views.FAQEscalationRespondView.as_view(),
        name="admin-faq-escalation-respond",
    ),
    path("languages/", mega_views.LanguageListCreateView.as_view(), name="admin-languages"),
    path(
        "languages/<str:code>/auto-translate/",
        mega_views.LanguageAutoTranslateView.as_view(),
        name="admin-language-auto-translate",
    ),
    path("reports/flights/", mega_views.AdminFlightReportView.as_view(), name="admin-report-flights"),
    path("reports/result/", mega_views.AdminResultReportView.as_view(), name="admin-report-result"),
    path(
        "reports/payment/",
        mega_views.AdminPaymentReportView.as_view(),
        name="admin-report-payment",
    ),
    path(
        "reports/tracking/",
        mega_views.AdminTrackingReportView.as_view(),
        name="admin-report-tracking",
    ),
    path("invoices/", mega_views.AdminInvoiceListView.as_view(), name="admin-invoices-list"),
    path(
        "invoices/<int:pk>/approve/",
        mega_views.AdminInvoiceApproveView.as_view(),
        name="admin-invoice-approve",
    ),
    path(
        "invoices/<int:pk>/reject/",
        mega_views.AdminInvoiceRejectView.as_view(),
        name="admin-invoice-reject",
    ),
    path(
        "invoices/<int:pk>/status/",
        mega_views.AdminInvoiceManualReviewView.as_view(),
        name="admin-invoice-status",
    ),
]
