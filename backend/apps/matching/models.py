"""
From "tutor applies" to "demo booked" (Sprint_5.md, Architecture Doc 3.13, 3.14, 8.8).

An application is one tutor's offer on one requirement. When a guardian shortlists a tutor and
books a demo, a Match records it, and a ContactUnlock records who got whose phone number and
when: contact stays hidden until that row exists.
"""

import uuid

from django.conf import settings
from django.db import models


class TutorApplication(models.Model):
    class Status(models.TextChoices):
        APPLIED = "applied", "Applied"
        VIEWED = "viewed", "Viewed"
        SHORTLISTED = "shortlisted", "Shortlisted"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tutor = models.ForeignKey(
        "tutors.TutorProfile", on_delete=models.CASCADE, related_name="applications"
    )
    requirement = models.ForeignKey(
        "guardians.Requirement", on_delete=models.CASCADE, related_name="applications"
    )
    # Read by the guardian before any contact opens, so it is screened like schedule_note
    message = models.CharField(max_length=300, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.APPLIED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tutor", "requirement"], name="one_application_per_tutor_requirement"
            )
        ]
        indexes = [models.Index(fields=["requirement", "status"])]

    def __str__(self):
        return f"Application {self.pk} ({self.status})"


class Match(models.Model):
    """A shortlisted tutor with a demo class booked on a requirement (Architecture Doc 3.13)."""

    class Status(models.TextChoices):
        TRIAL_SCHEDULED = "trial_scheduled", "Demo booked"
        CONFIRMED = "confirmed", "Confirmed by the guardian"  # Sprint 6
        DECLINED = "declined", "Declined"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requirement = models.ForeignKey(
        "guardians.Requirement", on_delete=models.CASCADE, related_name="matches"
    )
    tutor = models.ForeignKey(
        "tutors.TutorProfile", on_delete=models.CASCADE, related_name="matches"
    )
    application = models.OneToOneField(
        TutorApplication, null=True, on_delete=models.SET_NULL, related_name="match"
    )
    booked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="+"
    )
    demo_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TRIAL_SCHEDULED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "matches"
        constraints = [
            models.UniqueConstraint(fields=["requirement", "tutor"], name="one_match_per_pair")
        ]

    def __str__(self):
        return f"Match {self.pk} ({self.status})"


class ContactUnlock(models.Model):
    """
    The audit row for contact opening: which tutor got which guardian's number (through the
    requirement), when, and what was paid. Without this row nobody sees anybody's phone.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.OneToOneField(Match, on_delete=models.CASCADE, related_name="unlock")
    tutor = models.ForeignKey(
        "tutors.TutorProfile", on_delete=models.CASCADE, related_name="contact_unlocks"
    )
    requirement = models.ForeignKey(
        "guardians.Requirement", on_delete=models.CASCADE, related_name="contact_unlocks"
    )
    fee_paid = models.PositiveIntegerField(default=0, help_text="BDT; 0 while the fee is off")
    payment = models.ForeignKey(
        "payments.Payment", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-unlocked_at"]

    def __str__(self):
        return f"Unlock {self.pk}"
