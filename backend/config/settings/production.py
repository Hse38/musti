import os

from .base import *  # noqa: F401,F403

DEBUG = os.environ.get("DEBUG", "False").lower() in ("true", "1", "yes")


def _env_list(key: str, default: list | None = None) -> list:
    default = default or []
    raw = os.environ.get(key, "")
    if not raw.strip():
        return default
    return [x.strip() for x in raw.split(",") if x.strip()]


CORS_ALLOWED_ORIGINS = _env_list("CORS_ALLOWED_ORIGINS", [])
CORS_ALLOW_ALL_ORIGINS = True

ALLOWED_HOSTS = _env_list("ALLOWED_HOSTS", ["*"])
