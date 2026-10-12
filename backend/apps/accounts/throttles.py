"""
Login/register rate limits — Sprint_1.md.

Mobile operators in Bangladesh put thousands of users behind one IP (CGNAT), so a
tight per-IP limit would lock out real guardians. Brute force is stopped per account
(identifier) instead, with a looser per-IP ceiling against bulk attacks.
"""

from rest_framework.throttling import SimpleRateThrottle

from .validators import normalize_email_address, normalize_phone


class LoginIdentifierThrottle(SimpleRateThrottle):
    """5 attempts per minute against one phone/email, from any IP."""

    scope = "login_identifier"

    def get_cache_key(self, request, view):
        identifier = str(request.data.get("identifier", "")).strip()
        if not identifier:
            return None
        key = (
            normalize_email_address(identifier)
            if "@" in identifier
            else normalize_phone(identifier)
        )
        return self.cache_format % {"scope": self.scope, "ident": key}


class LoginIPThrottle(SimpleRateThrottle):
    scope = "login_ip"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class RegisterIPThrottle(SimpleRateThrottle):
    scope = "register_ip"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class PasswordChangeThrottle(SimpleRateThrottle):
    """5 attempts per minute per account: a stolen access token must not brute-force it."""

    scope = "password_change"

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        return self.cache_format % {"scope": self.scope, "ident": request.user.pk}


class DocumentUploadThrottle(SimpleRateThrottle):
    """5 uploads per minute per account (Architecture Doc §12.5)."""

    scope = "document_upload"

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        return self.cache_format % {"scope": self.scope, "ident": request.user.pk}


class AvatarUploadThrottle(SimpleRateThrottle):
    """5 profile-photo uploads per minute per account."""

    scope = "avatar_upload"

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        return self.cache_format % {"scope": self.scope, "ident": request.user.pk}
