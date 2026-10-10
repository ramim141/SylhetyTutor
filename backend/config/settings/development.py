"""
Development settings for SylhetyTutor.
"""
import os

from .base import *  # noqa: F403
from .base import BASE_DIR

DEBUG = True

ALLOWED_HOSTS = ["*"]

# Database configuration
# If DATABASE_URL is provided, use Postgres; else default to sqlite3 for lightweight local development
db_url = os.getenv("DATABASE_URL")

if db_url and "postgres" in db_url:
    import urllib.parse
    parsed = urllib.parse.urlparse(db_url)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": parsed.path.lstrip("/"),
            "USER": parsed.username,
            "PASSWORD": parsed.password,
            "HOST": parsed.hostname,
            "PORT": parsed.port or 5432,
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# Email backend for development
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
