from rest_framework.throttling import SimpleRateThrottle


class ApplicationCreateThrottle(SimpleRateThrottle):
    """Per account, not per IP: mobile carriers share IPs (CGNAT)."""

    scope = "application_create"

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        return self.cache_format % {"scope": self.scope, "ident": request.user.pk}


class ConfirmLinkThrottle(SimpleRateThrottle):
    """Per link, not per IP: the guardian opens it on a phone behind a shared carrier IP."""

    scope = "confirm_link"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": view.kwargs.get("token", "")[:80]}
