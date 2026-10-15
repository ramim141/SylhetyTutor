from rest_framework.throttling import SimpleRateThrottle


class ApplicationCreateThrottle(SimpleRateThrottle):
    """Per account, not per IP: mobile carriers share IPs (CGNAT)."""

    scope = "application_create"

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        return self.cache_format % {"scope": self.scope, "ident": request.user.pk}
