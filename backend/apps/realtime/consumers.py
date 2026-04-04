import json

from channels.generic.websocket import AsyncWebsocketConsumer


class AdminNotificationConsumer(AsyncWebsocketConsumer):
    """Admin / süper admin bildirim kanalı (JWT doğrulama üretimde eklenmeli)."""

    async def connect(self):
        await self.channel_layer.group_add("admin_notifications", self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard("admin_notifications", self.channel_name)

    async def admin_notify(self, event):
        await self.send(text_data=json.dumps(event.get("payload", {})))


class ParticipantStatusConsumer(AsyncWebsocketConsumer):
    """Katılımcı süreç durumu — grup: participant_{id}"""

    async def connect(self):
        self.pid = self.scope["url_route"]["kwargs"]["participant_id"]
        self.group = f"participant_{self.pid}"
        await self.channel_layer.group_add(self.group, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group, self.channel_name)

    async def status_update(self, event):
        await self.send(text_data=json.dumps(event.get("payload", {})))


def broadcast_admin_sync(payload: dict):
    """Senkron view'lardan çağrı için."""
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer

    layer = get_channel_layer()
    if not layer:
        return
    async_to_sync(layer.group_send)(
        "admin_notifications",
        {"type": "admin.notify", "payload": payload},
    )


def notify_participant_sync(participant_id: int, payload: dict):
    from asgiref.sync import async_to_sync
    from channels.layers import get_channel_layer

    layer = get_channel_layer()
    if not layer:
        return
    async_to_sync(layer.group_send)(
        f"participant_{participant_id}",
        {"type": "status.update", "payload": payload},
    )
