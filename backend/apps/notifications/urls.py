from django.urls import path

from . import views

urlpatterns = [
    path("test/", views.NotificationTestView.as_view(), name="notifications-test"),
]
