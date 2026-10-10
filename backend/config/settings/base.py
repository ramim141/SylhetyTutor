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

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
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
}

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
