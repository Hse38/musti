import os

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401,F403

# Railway: PostgreSQL eklentisini musti (web) servisine bağlayın; aksi halde DATABASE_URL/POSTGRES_URL gelmez.
DATABASE_URL = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")
if DATABASE_URL:
    DATABASE_URL = DATABASE_URL.strip()
    DATABASES = {"default": dj_database_url.parse(DATABASE_URL, conn_max_age=600)}
else:
    raise ImproperlyConfigured(
        "DATABASE_URL veya POSTGRES_URL yok. Railway'de Postgres ile musti servisi arasında referans/bağlantı ekleyin."
    )

DEBUG = os.environ.get("DEBUG", "False").lower() in ("true", "1", "yes")


def _env_list(key: str, default: list | None = None) -> list:
    default = default or []
    raw = os.environ.get(key, "")
    if not raw.strip():
        return default
    return [x.strip() for x in raw.split(",") if x.strip()]


CORS_ALLOWED_ORIGINS = _env_list("CORS_ALLOWED_ORIGINS", [])
CORS_ALLOW_ALL_ORIGINS = os.environ.get("CORS_ALLOW_ALL_ORIGINS", "").lower() in (
    "true",
    "1",
    "yes",
)
if not CORS_ALLOWED_ORIGINS:
    CORS_ALLOW_ALL_ORIGINS = True

ALLOWED_HOSTS = _env_list("ALLOWED_HOSTS", ["*"])
