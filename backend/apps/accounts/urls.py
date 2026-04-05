from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.portal.views import MagicLinkRequestView, MagicLinkVerifyView, TCTeamLoginView

urlpatterns = [
    path("magic-link/request/", MagicLinkRequestView.as_view(), name="auth_magic_request"),
    path("magic-link/verify/", MagicLinkVerifyView.as_view(), name="auth_magic_verify"),
    path("login/", TokenObtainPairView.as_view(), name="auth_login"),
    path("jwt/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("jwt/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("participant-login/", TCTeamLoginView.as_view(), name="participant_login"),
]
