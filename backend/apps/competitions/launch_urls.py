"""Admin: POST .../admin/competitions/launch/ — api_urls içinde admin/ include'undan ÖNCE bağlanır."""

from django.urls import path

from .views import CompetitionLaunchView

urlpatterns = [
    path("launch/", CompetitionLaunchView.as_view(), name="admin-competition-launch"),
]
