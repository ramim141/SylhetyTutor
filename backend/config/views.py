"""
Project-level views that don't belong to a feature app.
"""

import logging

from django.conf import settings
from django.core.cache import cache
from django.db import connection
from django.http import HttpResponse, JsonResponse

from apps.lookups.models import Area
from apps.tutors.models import TutorProfile

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


def sitemap_xml(request):
    """Architecture Doc 13.1 — XML sitemap for public discoverability."""
    base_url = settings.FRONTEND_URL.rstrip("/")
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    static_urls = [
        ("", "1.0", "daily"),
        ("/tutors", "0.9", "daily"),
        ("/about", "0.7", "monthly"),
        ("/terms", "0.5", "monthly"),
        ("/privacy", "0.5", "monthly"),
        ("/faq", "0.7", "weekly"),
        ("/safety", "0.7", "monthly"),
    ]
    for path, priority, changefreq in static_urls:
        loc = f"{base_url}{path}"
        lines.append(
            f"  <url><loc>{loc}</loc><changefreq>{changefreq}</changefreq>"
            f"<priority>{priority}</priority></url>"
        )

    tutors = TutorProfile.objects.filter(
        verification_status=TutorProfile.VerificationStatus.APPROVED,
        user__is_active=True,
    ).values_list("slug", flat=True)
    for slug in tutors:
        if slug:
            loc = f"{base_url}/tutors/{slug}"
            lines.append(
                f"  <url><loc>{loc}</loc><changefreq>weekly</changefreq>"
                f"<priority>0.8</priority></url>"
            )

    areas = Area.objects.filter(is_active=True).values_list("slug", flat=True)
    for slug in areas:
        loc = f"{base_url}/tutors/area/{slug}"
        lines.append(
            f"  <url><loc>{loc}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>"
        )

    lines.append("</urlset>")
    return HttpResponse("\n".join(lines), content_type="application/xml")


def robots_txt(request):
    """Architecture Doc 13.1 — robots.txt directives."""
    base_url = settings.FRONTEND_URL.rstrip("/")
    content = f"""User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /dashboard/
Disallow: /dev/
Disallow: /tutor/
Disallow: /requirements/

Sitemap: {base_url}/sitemap.xml
"""
    return HttpResponse(content, content_type="text/plain")
