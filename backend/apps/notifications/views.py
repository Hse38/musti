from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsOperator


class NotificationTestView(APIView):
    permission_classes = [IsOperator]

    def post(self, request):
        from django.conf import settings
        from django.core.mail import send_mail

        to = request.data.get("to", request.user.email)
        if not to:
            return Response(
                {"detail": "Alıcı e-posta gerekli."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        send_mail(
            "TEKNOFEST Bilet Kontrol — Test",
            "Bu bir test mesajıdır.",
            settings.DEFAULT_FROM_EMAIL,
            [to],
            fail_silently=False,
        )
        return Response({"ok": True, "to": to})
