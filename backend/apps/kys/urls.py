from django.urls import path

from . import views

urlpatterns = [
    path("participants/", views.KYSParticipantsView.as_view(), name="kys-participants"),
    path("sync/", views.KYSSyncView.as_view(), name="kys-sync"),
]
