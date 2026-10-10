"""
Development settings for SylhetyTutor.
"""

from .base import *  # noqa: F403
from .base import SECRET_KEY

DEBUG = True

ALLOWED_HOSTS = ["*"]

# Dev-only fallback so a fresh clone runs without .env; never used in production
SECRET_KEY = SECRET_KEY or "django-insecure-dev-only-sylhetytutor"

# Email backend for development
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
