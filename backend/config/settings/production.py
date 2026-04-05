import os
import dj_database_url
from .base import *  # noqa

DEBUG = False
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

db_url = os.environ.get('DATABASE_URL', '')
if db_url:
    DATABASES = {'default': dj_database_url.parse(db_url, conn_max_age=600)}

ALLOWED_HOSTS = ['*']
