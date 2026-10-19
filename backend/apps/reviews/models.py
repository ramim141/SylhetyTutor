"""
Review model — Architecture Doc Section 3.15, Sprint 7.
Only guardians with a confirmed match with the tutor can review.
Unique together: (tutor, guardian).
Updates TutorProfile.rating_avg and review_count.
"""

import uuid
from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Avg, Count


class Review(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tutor = models.ForeignKey(
        "tutors.TutorProfile", on_delete=models.CASCADE, related_name="reviews"
    )
    guardian = models.ForeignKey(
        "guardians.GuardianProfile", on_delete=models.CASCADE, related_name="reviews"
    )
    match = models.ForeignKey(
        "matching.Match",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviews",
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating between 1 and 5",
    )
    comment = models.TextField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tutor", "guardian"], name="unique_tutor_guardian_review"
            )
        ]

    def __str__(self):
        return f"Review {self.rating}★ by {self.guardian_id} for tutor {self.tutor_id}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.recalculate_tutor_rating()

    def delete(self, *args, **kwargs):
        tutor = self.tutor
        super().delete(*args, **kwargs)
        self._recalculate_for_tutor(tutor)

    def recalculate_tutor_rating(self):
        self._recalculate_for_tutor(self.tutor)

    @classmethod
    def _recalculate_for_tutor(cls, tutor):
        aggregates = cls.objects.filter(tutor=tutor).aggregate(
            avg_rating=Avg("rating"),
            count=Count("id"),
        )
        avg = aggregates["avg_rating"]
        tutor.rating_avg = Decimal(str(round(avg, 1))) if avg is not None else Decimal("0.0")
        tutor.review_count = aggregates["count"] or 0
        tutor.save(update_fields=["rating_avg", "review_count"])
