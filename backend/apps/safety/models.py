"""
Safety and reporting models — Sprint 7, Architecture Doc 11.5 & Pre-launch safety.
Allows users to report misconduct or issues, and allows guardians to request
free tuition replacement if unsatisfied with a confirmed match.
"""

import uuid

from django.conf import settings
from django.db import models


class Report(models.Model):
    class Category(models.TextChoices):
        INAPPROPRIATE_BEHAVIOR = "inappropriate_behavior", "Inappropriate behavior"
        FAKE_PROFILE = "fake_profile", "Fake profile / false information"
        HARASSMENT = "harassment", "Harassment or abuse"
        UNRESPONSIVE = "unresponsive", "Unresponsive / missing scheduled sessions"
        PAYMENT_ISSUE = "payment_issue", "Payment / financial dispute"
        SAFETY_CONCERN = "safety_concern", "Safety concern"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending review"
        REVIEWED = "reviewed", "Under investigation"
        RESOLVED = "resolved", "Resolved"
        DISMISSED = "dismissed", "Dismissed"

    class ActionTaken(models.TextChoices):
        NONE = "none", "No action"
        WARNED = "warned", "User warned"
        SUSPENDED = "suspended", "Account suspended"
        DISMISSED = "dismissed", "Report dismissed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="filed_reports"
    )
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports_against"
    )
    category = models.CharField(max_length=40, choices=Category.choices)
    reason = models.TextField(max_length=1000)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    action_taken = models.CharField(
        max_length=20, choices=ActionTaken.choices, default=ActionTaken.NONE
    )
    admin_notes = models.TextField(blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_reports",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self):
        return f"Report {self.id} ({self.category}) against {self.target_user_id}"


class ReplacementRequest(models.Model):
    """
    11.5 Satisfaction Guarantee:
    If a guardian is unsatisfied with a tutor on a confirmed match, they can request a replacement.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSED = "processed", "Processed"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.ForeignKey(
        "matching.Match", on_delete=models.CASCADE, related_name="replacement_requests"
    )
    guardian = models.ForeignKey(
        "guardians.GuardianProfile", on_delete=models.CASCADE, related_name="replacement_requests"
    )
    reason = models.TextField(max_length=1000)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    admin_notes = models.TextField(blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"ReplacementRequest for Match {self.match_id} ({self.status})"
