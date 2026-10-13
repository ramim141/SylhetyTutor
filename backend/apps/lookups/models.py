"""
Reference lookup models for Sylhet city — Architecture Doc Section 3.2-3.4.
Provides areas, subjects, class tiers, and universities.
"""

import uuid

from django.db import models


class BaseLookupModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name_en = models.CharField(max_length=100)
    name_bn = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["sort_order", "name_en"]

    def __str__(self):
        return f"{self.name_en} ({self.name_bn})"


class Area(BaseLookupModel):
    """
    Sylhet city areas (e.g., Amberkhana, Zindabazar, Shibganj, etc.).
    """

    class Meta(BaseLookupModel.Meta):
        verbose_name = "Area"
        verbose_name_plural = "Areas"


class Subject(BaseLookupModel):
    """
    Subjects offered for tuition (e.g., Math, Physics, English, etc.).
    """

    class Meta(BaseLookupModel.Meta):
        verbose_name = "Subject"
        verbose_name_plural = "Subjects"


class ClassLevel(BaseLookupModel):
    """
    Student class tiers (e.g., Class 1-5, SSC, HSC, English Medium).
    """

    class Meta(BaseLookupModel.Meta):
        verbose_name = "Class Level"
        verbose_name_plural = "Class Levels"


class University(BaseLookupModel):
    """
    Universities in Sylhet where tutors study (SUST, Metropolitan, Leading, etc.).
    """

    short_name = models.CharField(max_length=50, blank=True)

    class Meta(BaseLookupModel.Meta):
        verbose_name = "University"
        verbose_name_plural = "Universities"

    def __str__(self):
        display = self.short_name or self.name_en
        return f"{display} — {self.name_bn}"
