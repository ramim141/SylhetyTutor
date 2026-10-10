"""
Authentication backend allowing login with either phone or email.
Sprint 1 — Architecture Doc Section 3.1 & Sprint_1.md.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q

from .validators import normalize_email_address, normalize_phone

User = get_user_model()


class PhoneOrEmailBackend(ModelBackend):
    """
    Authenticates against settings.AUTH_USER_MODEL using either phone or email.
    """

    def authenticate(self, request, username=None, password=None, identifier=None, **kwargs):
        # Support identifier parameter as well as standard username
        login_val = identifier or username
        if not login_val or not password:
            return None

        clean_login = str(login_val).strip()
        normalized_ph = normalize_phone(clean_login)
        normalized_em = normalize_email_address(clean_login)

        # Look for matching active user by phone or email
        user = User.objects.filter(Q(phone=normalized_ph) | Q(email=normalized_em)).first()

        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
