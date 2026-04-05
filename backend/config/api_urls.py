from django.urls import include, path

"""
api/v1/ altında yarışma ile ilgili yollar (özet):

- GET  competitions/                 → apps.competitions.urls (halka açık aktif yarışmalar)
- POST admin/competitions/launch/     → admin_panel.urls (CompetitionLaunchView)
- GET/POST admin/competitions/        → admin_panel (liste / oluşturma)
- … diğer admin/competitions/<id>/…   → admin_panel.urls
"""

urlpatterns = [
    path("competitions/", include("apps.competitions.urls")),
    path("auth/", include("apps.accounts.urls")),
    path("portal/", include("apps.portal.urls")),
    path("", include("apps.portal.urls")),
    path("sessions/", include("apps.tickets.urls")),
    path("admin/", include("apps.admin_panel.urls")),
    path("modules/kys/", include("apps.kys.urls")),
    path("modules/notifications/", include("apps.notifications.urls")),
]
