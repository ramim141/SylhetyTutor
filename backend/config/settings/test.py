"""
Test settings: fast and isolated. CI sets DATABASE_URL to Postgres; locally falls back to SQLite.
"""

from .development import *  # noqa: F403

DEBUG = False

# Hashing passwords is the slowest part of auth tests; MD5 is fine for test data only
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
