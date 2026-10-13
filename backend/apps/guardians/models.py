"""
Guardian side of the marketplace (Sprint_4.md): a guardian profile and the tuition requirements
they post. A requirement is a draft until published, open while tutors can see it, closed when
the guardian is done. "Expired" is not stored: an open requirement older than
REQUIREMENT_LIFETIME_DAYS simply stops matching.
"""

import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.db.models import F, Q
from django.utils import timezone


class GuardianProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="guardian_profile"
    )
    # Reserved for the OTP step; nothing sets it yet
    phone_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Guardian {self.user_id}"


class Requirement(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        OPEN = "open", "Open"
        CLOSED = "closed", "Closed"

    class Gender(models.TextChoices):
        ANY = "any", "Any"
        MALE = "male", "Male"
        FEMALE = "female", "Female"

    class CloseReason(models.TextChoices):
        FOUND_TUTOR = "found_tutor", "Found a tutor"
        NO_LONGER_NEEDED = "no_longer_needed", "No longer needed"
        OTHER = "other", "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    guardian = models.ForeignKey(
        GuardianProfile, on_delete=models.CASCADE, related_name="requirements"
    )
    class_level = models.ForeignKey(
        "lookups.ClassLevel", null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )
    area = models.ForeignKey(
        "lookups.Area", null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )
    subjects = models.ManyToManyField("lookups.Subject", blank=True, related_name="requirements")
    budget_min = models.PositiveIntegerField(null=True, blank=True, help_text="BDT per month")
    budget_max = models.PositiveIntegerField(null=True, blank=True, help_text="BDT per month")
    preferred_gender = models.CharField(max_length=10, choices=Gender.choices, default=Gender.ANY)
    # Free text the tutor reads, so it is screened for phone numbers and links (validators.py)
    schedule_note = models.CharField(max_length=300, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    published_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    close_reason = models.CharField(max_length=20, choices=CloseReason.choices, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "area", "-published_at"])]
        constraints = [
            models.CheckConstraint(
                condition=Q(budget_min__isnull=True)
                | Q(budget_max__isnull=True)
                | Q(budget_min__lte=F("budget_max")),
                name="requirement_budget_min_lte_max",
            )
        ]

    def __str__(self):
        return f"Requirement {self.pk} ({self.status})"

    @property
    def expires_at(self):
        if self.status != self.Status.OPEN or not self.published_at:
            return None
        return self.published_at + timedelta(days=settings.REQUIREMENT_LIFETIME_DAYS)

    @property
    def is_expired(self):
        expires = self.expires_at
        return bool(expires and expires <= timezone.now())

    def missing_fields(self):
        """What must be filled before publishing."""
        gaps = []
        if not self.class_level_id:
            gaps.append("class_level")
        if not self.area_id:
            gaps.append("area")
        if not self.subjects.exists():
            gaps.append("subjects")
        return gaps
