"""
Base settings for SylhetyTutor project.
"""

import os
import urllib.parse
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load .env from the repo root (local runs outside Docker); real env vars take precedence
load_dotenv(BASE_DIR.parent / ".env")


def env_list(name, default=""):
    """Comma-separated env var -> list, ignoring blanks."""
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


def database_from_url(url):
    """postgres://user:pass@host:port/name -> Django DATABASES entry."""
    parsed = urllib.parse.urlparse(url)
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": parsed.path.lstrip("/"),
        "USER": urllib.parse.unquote(parsed.username or ""),
        "PASSWORD": urllib.parse.unquote(parsed.password or ""),
        "HOST": parsed.hostname,
        "PORT": parsed.port or 5432,
        "CONN_MAX_AGE": 60,
        "CONN_HEALTH_CHECKS": True,
    }


# Empty here on purpose: development.py supplies a dev-only key, production.py refuses to start
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "")

DEBUG = False

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

# Application definition
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
]

# Add each app here when its folder is created (Sprint plan order):
# apps.lookups, apps.tutors, apps.guardians, apps.matching, apps.reviews, apps.payments
LOCAL_APPS = [
    "apps.accounts",
    "apps.lookups",
    "apps.tutors",
    "apps.notifications",
    "apps.guardians",
    "apps.matching",
    "apps.payments",
    "apps.reviews",
    "apps.safety",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Database: Postgres when DATABASE_URL is set (Docker, CI, production), else SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "")
DATABASES = {
    "default": database_from_url(DATABASE_URL)
    if DATABASE_URL
    else {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}
}

# Cache: Redis when REDIS_URL is set, else per-process memory
REDIS_URL = os.getenv("REDIS_URL", "")
CACHES = {
    "default": {"BACKEND": "django.core.cache.backends.redis.RedisCache", "LOCATION": REDIS_URL}
    if REDIS_URL
    else {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
}

# Custom Auth Model
AUTH_USER_MODEL = "accounts.User"

AUTHENTICATION_BACKENDS = [
    "apps.accounts.backends.PhoneOrEmailBackend",
    "django.contrib.auth.backends.ModelBackend",
]

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
        # Our User has full_name/phone, not Django's default username/first_name/last_name
        "OPTIONS": {"user_attributes": ("full_name", "phone", "email")},
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Dhaka"
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Media files
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# NID and student-ID scans live here, outside MEDIA_ROOT, and are never mapped to a URL:
# they are only ever streamed by an authenticated view (see apps/tutors/documents.py).
# Production needs a persistent volume (or a private bucket, Sprint 8).
PRIVATE_MEDIA_ROOT = Path(os.getenv("PRIVATE_MEDIA_ROOT", BASE_DIR / "private_media"))

# Where the web app lives: emails link here
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Email (for users who gave an address; development prints to the console). Production sends
# through SMTP: set EMAIL_HOST, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD, DEFAULT_FROM_EMAIL.
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "localhost")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True") == "True"
EMAIL_TIMEOUT = int(os.getenv("EMAIL_TIMEOUT", "10"))
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "SylhetyTutor <no-reply@sylhetytutor.com>")

# Profile photos go to imgBB (a public host: never send identity documents there).
# Without a key the avatar endpoint answers 503 `uploads_unavailable`.
IMGBB_API_KEY = os.getenv("IMGBB_API_KEY", "")
IMGBB_API_URL = os.getenv("IMGBB_API_URL", "https://api.imgbb.com/1/upload")
IMGBB_TIMEOUT = int(os.getenv("IMGBB_TIMEOUT", "15"))

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Django REST Framework
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticatedOrReadOnly",),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "config.exceptions.custom_exception_handler",
    # No global anonymous limit: Bangladeshi mobile users share IPs (CGNAT), so a
    # per-IP daily cap would block real guardians browsing tutors. See accounts/throttles.py
    "DEFAULT_THROTTLE_RATES": {
        "login_identifier": "5/minute",
        "login_ip": "60/minute",
        "register_ip": "30/hour",
        "password_change": "5/minute",
        "document_upload": "5/minute",
        "avatar_upload": "5/minute",
        "requirement_create": "10/hour",
        "application_create": "30/hour",
        "payment_submit": "10/hour",
        "confirm_link": "30/hour",
    },
}

# Guardian requirements (Sprint_4.md)
MAX_OPEN_REQUIREMENTS = 3
MAX_DRAFT_REQUIREMENTS = 5
REQUIREMENT_LIFETIME_DAYS = 30

# Apply and demo booking (Sprint_5.md)
MAX_APPLICATION_MESSAGE = 300
DEMO_MIN_LEAD_HOURS = 1  # a demo cannot start sooner than this from now
DEMO_MAX_DAYS_AHEAD = 30
# Architecture Doc 8.8: contact opens for a fee. Off until payment exists (Sprint 6); while on and
# unpaid, a booked demo does NOT open contact.
UNLOCK_FEE_ENABLED = os.getenv("UNLOCK_FEE_ENABLED", "false").lower() == "true"
UNLOCK_FEE_AMOUNT = 150  # BDT, proposed range 100-200

# Payments and commission (Sprint_6.md). bKash Send Money number tutors pay to: set it in env.
BKASH_NUMBER = os.getenv("BKASH_NUMBER", "01700000000")
# Architecture Doc 8.8 leaves the rate open (percent of the first month vs fixed): one number here
COMMISSION_AMOUNT = 500  # BDT per confirmed tuition
COMMISSION_DUE_DAYS = 7  # invoice due this many days after the guardian confirms
COMMISSION_REMINDER_DAYS = 14
COMMISSION_SUSPEND_DAYS = 21
CONFIRMATION_AFTER_DAYS = 7  # ask the guardian this long after the demo
CONFIRMATION_CALL_AFTER_DAYS = 3  # no answer by then: onto the admin's call list
CONFIRMATION_LINK_MAX_AGE_DAYS = 30

# SimpleJWT configuration
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(os.getenv("ACCESS_TOKEN_LIFETIME", "30"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(minutes=int(os.getenv("REFRESH_TOKEN_LIFETIME", "10080"))),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# CORS: only the React app may call the API from a browser
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)
CORS_ALLOW_CREDENTIALS = True

# Spectacular (OpenAPI Docs)
SPECTACULAR_SETTINGS = {
    "TITLE": "SylhetyTutor API",
    "DESCRIPTION": "Production API for SylhetyTutor Platform",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}
