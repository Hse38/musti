CORS_ALLOW_ALL_ORIGINS = True

import os

from . import base as _settings_base
from .base import *  # noqa: F401,F403

DEBUG = os.environ.get("DEBUG", "False").lower() in ("true", "1", "yes")


def _env_list(key: str, default: list | None = None) -> list:
    default = default or []
    raw = os.environ.get(key, "")
    if not raw.strip():
        return default
    return [x.strip() for x in raw.split(",") if x.strip()]


DATABASES = _settings_base.DATABASES

CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOWED_ORIGINS = _env_list("CORS_ALLOWED_ORIGINS", [])

ALLOWED_HOSTS = _env_list("ALLOWED_HOSTS", ["*"])
