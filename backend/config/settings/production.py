import os

from .base import *  # noqa: F401,F403

DEBUG = os.environ.get("DEBUG", "False").lower() in ("true", "1", "yes")
