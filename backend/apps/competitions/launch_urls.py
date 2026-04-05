from django.urls import path

from .views import CompetitionLaunchView

urlpatterns = [
    path("launch/", CompetitionLaunchView.as_view(), name="competition-launch"),
]
