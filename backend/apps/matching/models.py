"""
From "tutor applies" to "demo booked" (Sprint_5.md, Architecture Doc 3.13, 3.14, 8.8).

An application is one tutor's offer on one requirement. When a guardian shortlists a tutor and
books a demo, a Match records it, and a ContactUnlock records who got whose phone number and
when: contact stays hidden until that row exists.
"""

import uuid

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
