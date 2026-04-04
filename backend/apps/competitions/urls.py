from django.urls import path

from . import views

urlpatterns = [
    path("", views.ActiveCompetitionListView.as_view(), name="competitions-public"),
]
