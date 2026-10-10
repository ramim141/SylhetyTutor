"""
Custom User model — Architecture Doc Section 3.1.
Single table for all roles; login with phone or email.
"""

import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.db.models import Q

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        GUARDIAN = "guardian", "Guardian"
        TUTOR = "tutor", "Tutor"
        ADMIN = "admin", "Admin"

    class Language(models.TextChoices):
        EN = "en", "English"
        BN = "bn", "বাংলা"
        MIXED = "mixed", "Mixed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(max_length=20, unique=True, null=True, blank=True)
    email = models.EmailField(max_length=255, unique=True, null=True, blank=True)
    full_name = models.CharField(max_length=150)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.GUARDIAN)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    preferred_language = models.CharField(
        max_length=5, choices=Language.choices, default=Language.MIXED
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    # Phone is the primary login in Sylhet;
    # email-only users are resolved in the auth backend (Sprint 1)
    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        ordering = ["-date_joined"]
        constraints = [
            models.CheckConstraint(
                condition=Q(phone__isnull=False) | Q(email__isnull=False),
                name="user_phone_or_email_required",
            ),
        ]

    def __str__(self):
        return f"{self.full_name} ({self.phone or self.email})"
