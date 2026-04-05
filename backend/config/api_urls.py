from django.urls import include, path

from apps.competitions.views import CompetitionLaunchView

urlpatterns = [
    # Sabit yollar önce (boş önekli portal include'undan önce eşleşsin)
    path("competitions/", include("apps.competitions.urls")),
    path(
        "admin/competitions/launch/",
        CompetitionLaunchView.as_view(),
        name="admin-competition-launch",
    ),
    path("auth/", include("apps.accounts.urls")),
    path("portal/", include("apps.portal.urls")),
    path("", include("apps.portal.urls")),
    path("sessions/", include("apps.tickets.urls")),
    path("admin/", include("apps.admin_panel.urls")),
    path("modules/kys/", include("apps.kys.urls")),
    path("modules/notifications/", include("apps.notifications.urls")),
]
