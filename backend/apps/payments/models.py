"""
Money that tutors send us by bKash Send Money (Sprint_6.md, Architecture Doc 8.5 and 8.8).

A payment is a claim: "I sent ৳X from this number, TrxID is Y". It stays `pending` until an admin
has checked the TrxID in the bKash merchant app, then becomes `verified` (and whatever it paid
for happens) or `rejected` (with a reason the tutor reads).
"""

import uuid

from django.conf import settings
from django.db import models


class Payment(models.Model):
    class Purpose(models.TextChoices):
        UNLOCK = "unlock", "Contact unlock fee"
        COMMISSION = "commission", "Commission"

    class Status(models.TextChoices):
        PENDING = "pending", "Waiting for verification"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="payments"
    )
    purpose = models.CharField(max_length=12, choices=Purpose.choices)
    amount = models.PositiveIntegerField(help_text="BDT, fixed by us when the payment is made")
    method = models.CharField(max_length=20, default="bkash")
    sender_number = models.CharField(max_length=20, help_text="The bKash number it was sent from")
    # One TrxID can pay once, ever: rejected ones stay here so they cannot be reused either
    transaction_id = models.CharField(max_length=20, unique=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    match = models.ForeignKey(
        "matching.Match", null=True, blank=True, on_delete=models.SET_NULL, related_name="payments"
    )
    reject_reason = models.CharField(max_length=300, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [models.Index(fields=["status", "created_at"])]

    def __str__(self):
        return f"{self.purpose} ৳{self.amount} {self.transaction_id} ({self.status})"
