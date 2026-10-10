"""
Tutor profile and preferences — Architecture Doc Section 3.2.
Stores tutor university details, subject specialties, tuition areas, and rates.
"""

import uuid

from django.conf import settings
from django.db import models

from apps.lookups.models import Area, ClassLevel, Subject, University


class TutorProfile(models.Model):
    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"

    class VerificationStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tutor_profile",
    )
    gender = models.CharField(max_length=10, choices=Gender.choices, default=Gender.MALE)
    university = models.ForeignKey(
        University,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tutors",
    )
    department = models.CharField(max_length=150, blank=True)
    year = models.CharField(max_length=50, blank=True, help_text="e.g. 3rd Year")
    bio = models.TextField(max_length=400, blank=True)
    fee_min = models.PositiveIntegerField(default=3000, help_text="Minimum monthly fee in BDT")
    fee_max = models.PositiveIntegerField(default=7000, help_text="Maximum monthly fee in BDT")
    is_featured = models.BooleanField(default=False)
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.APPROVED,
    )
    rating_avg = models.DecimalField(max_digits=3, decimal_places=1, default=5.0)
    review_count = models.PositiveIntegerField(default=0)

    # Preferences & Specializations
    subjects = models.ManyToManyField(Subject, blank=True, related_name="tutors")
    class_levels = models.ManyToManyField(ClassLevel, blank=True, related_name="tutors")
    areas = models.ManyToManyField(Area, blank=True, related_name="tutors")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_featured", "-rating_avg", "-created_at"]
        verbose_name = "Tutor Profile"
        verbose_name_plural = "Tutor Profiles"

    def __str__(self):
        uni = self.university.short_name if self.university else "Tutor"
        return f"{self.user.full_name} ({uni})"

    @property
    def is_verified(self):
        return self.verification_status == self.VerificationStatus.APPROVED

    @property
    def initials(self):
        parts = self.user.full_name.strip().split()
        if len(parts) >= 2:
            return f"{parts[0][0]}{parts[1][0]}".upper()
        return self.user.full_name[:2].upper() if self.user.full_name else "TU"
