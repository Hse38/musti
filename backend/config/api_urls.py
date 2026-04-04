from django.urls import include, path

urlpatterns = [
    # Sabit yollar önce (boş önekli portal include'undan önce eşleşsin)
    path("competitions/", include("apps.competitions.urls")),
    path("auth/", include("apps.accounts.urls")),
    path("", include("apps.portal.urls")),
    path("sessions/", include("apps.tickets.urls")),
    path("admin/", include("apps.admin_panel.urls")),
    path("modules/kys/", include("apps.kys.urls")),
    path("modules/notifications/", include("apps.notifications.urls")),
]
