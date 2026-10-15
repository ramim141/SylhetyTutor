"""
Tutor profile and preferences — Architecture Doc Section 3.2.
Stores tutor university details, subject specialties, tuition areas, and rates.
"""

import uuid

from django.conf import settings
from django.db import models

from apps.lookups.models import Area, ClassLevel, Subject, University

from .documents import document_upload_to, private_storage
from .slugs import MAX_LENGTH as SLUG_MAX_LENGTH
from .slugs import build_slug


class TutorProfile(models.Model):
    class Gender(models.TextChoices):
        MALE = "male", "Male"
        FEMALE = "female", "Female"

    class VerificationStatus(models.TextChoices):
        # Being filled in by the tutor: never shown to admins or in search
        DRAFT = "draft", "Draft"
        # Submitted, waiting for an admin
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tutor_profile",
    )
    # Blank until the tutor chooses: a draft must not look finished because of a default
    gender = models.CharField(max_length=10, choices=Gender.choices, blank=True, default="")
    university = models.ForeignKey(
        University,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tutors",
    )
    department = models.CharField(max_length=150, blank=True)
    year = models.CharField(max_length=50, blank=True, help_text="e.g. 3rd Year")
    student_id_number = models.CharField(max_length=50, blank=True)
    # Public address, made when the profile is first approved and never changed (see slugs.py)
    slug = models.SlugField(max_length=SLUG_MAX_LENGTH, unique=True, null=True, blank=True)
    # Identity documents: private storage, no URL (see documents.py)
    nid_photo = models.FileField(
        upload_to=document_upload_to, storage=private_storage, blank=True, max_length=255
    )
    student_id_photo = models.FileField(
        upload_to=document_upload_to, storage=private_storage, blank=True, max_length=255
    )
    bio = models.TextField(max_length=400, blank=True)
    # Null until the tutor sets them; an approved profile always has both
    fee_min = models.PositiveIntegerField(
        null=True, blank=True, help_text="Minimum monthly fee in BDT"
    )
    fee_max = models.PositiveIntegerField(
        null=True, blank=True, help_text="Maximum monthly fee in BDT"
    )
    is_featured = models.BooleanField(default=False)
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.DRAFT,
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verified_tutors",
    )
    rating_avg = models.DecimalField(max_digits=3, decimal_places=1, default=0)
    review_count = models.PositiveIntegerField(default=0)

    # Money (Sprint_6.md). Founding tutors owe no commission until this date (Architecture Doc
    # 8.8); an unpaid commission past the limit pauses new applications until it is paid.
    founding_until = models.DateField(null=True, blank=True)
    suspended_at = models.DateTimeField(null=True, blank=True)

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

    def save(self, *args, **kwargs):
        if self.verification_status == self.VerificationStatus.APPROVED and not self.slug:
            self.slug = build_slug(self, TutorProfile)
            if kwargs.get("update_fields") is not None:
                kwargs["update_fields"] = {*kwargs["update_fields"], "slug"}
        super().save(*args, **kwargs)

    # Fields an approved profile must have (checked in clean(), so Django admin cannot skip them)
    REQUIRED_FIELDS = (
        "gender",
        "nid_photo",
        "student_id_photo",
        "university",
        "department",
        "year",
        "student_id_number",
        "fee_min",
        "fee_max",
    )
    # Everything needed to submit, in the order the 6-step form asks for it
    FORM_ORDER = (
        "gender",
        "nid_photo",
        "student_id_photo",
        "university",
        "department",
        "year",
        "student_id_number",
        "subjects",
        "class_levels",
        "areas",
        "availability",
        "fee_min",
        "fee_max",
    )
    RELATIONS = ("subjects", "class_levels", "areas", "availability")

    def missing_fields(self):
        """Names of required things still empty, in the order the form asks for them."""
        return [name for name in self.FORM_ORDER if self._is_blank(name)]

    def _is_blank(self, name):
        if name in self.RELATIONS:
            return not self.pk or not getattr(self, name).exists()
        if name == "university":
            return self.university_id is None
        if name in ("nid_photo", "student_id_photo"):
            return not getattr(self, name)
        return getattr(self, name) in (None, "")

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.fee_min is not None and self.fee_max is not None and self.fee_min > self.fee_max:
            raise ValidationError({"fee_min": "Minimum fee cannot be higher than the maximum."})
        if self.verification_status == self.VerificationStatus.APPROVED:
            gaps = [name for name in self.missing_fields() if name in self.REQUIRED_FIELDS]
            if gaps:
                raise ValidationError(
                    "Cannot approve an incomplete profile. Missing: " + ", ".join(gaps)
                )

    @property
    def is_verified(self):
        return self.verification_status == self.VerificationStatus.APPROVED

    @property
    def initials(self):
        parts = self.user.full_name.strip().split()
        if len(parts) >= 2:
            return f"{parts[0][0]}{parts[1][0]}".upper()
        return self.user.full_name[:2].upper() if self.user.full_name else "TU"


class TutorAvailability(models.Model):
    """One free slot in the tutor's week (7 days x 3 slots) — Architecture Doc §3.10."""

    class Day(models.TextChoices):
        SAT = "sat", "Saturday"
        SUN = "sun", "Sunday"
        MON = "mon", "Monday"
        TUE = "tue", "Tuesday"
        WED = "wed", "Wednesday"
        THU = "thu", "Thursday"
        FRI = "fri", "Friday"

    class Slot(models.TextChoices):
        MORNING = "morning", "Morning"
        AFTERNOON = "afternoon", "Afternoon"
        EVENING = "evening", "Evening"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tutor = models.ForeignKey(TutorProfile, on_delete=models.CASCADE, related_name="availability")
    day = models.CharField(max_length=3, choices=Day.choices)
    slot = models.CharField(max_length=10, choices=Slot.choices)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["tutor", "day", "slot"], name="unique_tutor_day_slot"),
        ]
        verbose_name = "Tutor availability"
        verbose_name_plural = "Tutor availability"

    def __str__(self):
        return f"{self.tutor_id} {self.day} {self.slot}"


class VerificationEvent(models.Model):
    """Who sent a profile for review and who decided on it, and why. Never edited, only added."""

    class Action(models.TextChoices):
        SUBMITTED = "submitted", "Submitted"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        DOCUMENT_VIEWED = "document_viewed", "Document viewed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(
        TutorProfile, on_delete=models.CASCADE, related_name="verification_events"
    )
    action = models.CharField(max_length=20, choices=Action.choices)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verification_events",
    )
    reason = models.TextField(blank=True)
    # small plain extras, e.g. {"kind": "nid"} for document_viewed
    meta = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} {self.profile_id}"
