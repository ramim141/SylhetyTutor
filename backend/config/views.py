"""
Project-level views that don't belong to a feature app.
"""

import logging

from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse

logger = logging.getLogger(__name__)


def _check_database():
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        return True
    except Exception:
        logger.exception("Health check: database unreachable")
        return False


def _check_cache():
    try:
        cache.set("health_check", "ok", timeout=5)
        return cache.get("health_check") == "ok"
    except Exception:
        logger.exception("Health check: cache unreachable")
        return False


def health_check(request):
    """Architecture Doc 12.6 — 200 when every dependency answers, else 503 for uptime monitors."""
    checks = {"database": _check_database(), "cache": _check_cache()}
    healthy = all(checks.values())
    return JsonResponse(
        {
            "status": "healthy" if healthy else "degraded",
            "service": "SylhetyTutor API",
            "version": "1.0.0",
            "checks": checks,
        },
        status=200 if healthy else 503,
    )
