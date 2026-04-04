from django.urls import include, path

urlpatterns = [
    path("", include("apps.portal.urls")),
    path("auth/", include("apps.accounts.urls")),
    path("competitions/", include("apps.competitions.urls")),
    path("sessions/", include("apps.tickets.urls")),
    path("admin/", include("apps.admin_panel.urls")),
    path("modules/kys/", include("apps.kys.urls")),
    path("modules/notifications/", include("apps.notifications.urls")),
]
