import os

from . import base as _settings_base
from .base import *  # noqa: F401,F403

_cors_idx = INSTALLED_APPS.index("rest_framework_simplejwt")
INSTALLED_APPS = list(INSTALLED_APPS)
INSTALLED_APPS.insert(_cors_idx + 1, "corsheaders")

MIDDLEWARE = list(MIDDLEWARE)
_wh = MIDDLEWARE.index("whitenoise.middleware.WhiteNoiseMiddleware")
MIDDLEWARE.insert(_wh + 1, "corsheaders.middleware.CorsMiddleware")

DEBUG = os.environ.get("DEBUG", "False").lower() in ("true", "1", "yes")


def _env_list(key: str, default: list | None = None) -> list:
    default = default or []
    raw = os.environ.get(key, "")
    if not raw.strip():
        return default
    return [x.strip() for x in raw.split(",") if x.strip()]


DATABASES = _settings_base.DATABASES

CORS_ALLOW_ALL_ORIGINS = True

ALLOWED_HOSTS = _env_list("ALLOWED_HOSTS", ["*"])
