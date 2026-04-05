from .base import *  # noqa: F401,F403

DEBUG = True
ALLOWED_HOSTS = ["*"]

_cors_idx = INSTALLED_APPS.index("rest_framework_simplejwt")
INSTALLED_APPS = list(INSTALLED_APPS)
INSTALLED_APPS.insert(_cors_idx + 1, "corsheaders")

MIDDLEWARE = list(MIDDLEWARE)
_wh = MIDDLEWARE.index("whitenoise.middleware.WhiteNoiseMiddleware")
MIDDLEWARE.insert(_wh + 1, "corsheaders.middleware.CorsMiddleware")

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
CORS_ALLOW_CREDENTIALS = True
