from django.urls import re_path

from apps.realtime.consumers import AdminNotificationConsumer, ParticipantStatusConsumer

websocket_urlpatterns = [
    re_path(r"ws/admin/notifications/$", AdminNotificationConsumer.as_asgi()),
    re_path(
        r"ws/participant/(?P<participant_id>\d+)/$",
        ParticipantStatusConsumer.as_asgi(),
    ),
]
