from django.urls import path

from . import views

urlpatterns = [
    path("dashboard/", views.AdminDashboardView.as_view(), name="admin-dashboard"),
    path("rules/", views.RuleListView.as_view(), name="admin-rules"),
    path("rules/categories/", views.RuleCategoriesView.as_view(), name="admin-rule-categories"),
    path("rules/<int:pk>/", views.RulePatchView.as_view(), name="admin-rule-patch"),
    path("modules/", views.ModuleListView.as_view(), name="admin-modules"),
    path("modules/<str:name>/", views.ModulePatchView.as_view(), name="admin-module-patch"),
    path("competitions/", views.CompetitionListCreateView.as_view(), name="admin-competitions"),
    path(
        "competitions/<int:pk>/",
        views.CompetitionDetailView.as_view(),
        name="admin-competition-detail",
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
]
