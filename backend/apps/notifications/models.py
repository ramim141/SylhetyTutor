"""
In-app notifications (Sprint Plan, Sprint 4–5).

A notification stores *what happened* (a kind plus a little data), not a sentence: the page
turns it into text in the reader's language (EN / বাং / Mixed). Email, when the user has an
address, is sent in `preferred_language` (see emails.py).
"""

import uuid

from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Kind(models.TextChoices):
        PROFILE_APPROVED = "profile_approved", "Tutor profile approved"
        PROFILE_REJECTED = "profile_rejected", "Tutor profile needs changes"
        APPLICATION_RECEIVED = "application_received", "A tutor applied to your requirement"
        APPLICATION_SHORTLISTED = "application_shortlisted", "You were shortlisted"
        APPLICATION_REJECTED = "application_rejected", "Your application was not taken"
        DEMO_BOOKED = "demo_booked", "A demo class was booked"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    kind = models.CharField(max_length=40, choices=Kind.choices)
    # Small, plain data the text needs, e.g. {"reason": "Student ID is unreadable"}
    data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "read_at", "-created_at"])]

    def __str__(self):
        return f"{self.kind} → {self.user_id}"

    @property
    def is_read(self):
        return self.read_at is not None
