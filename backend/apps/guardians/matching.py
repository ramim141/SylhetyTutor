"""Which open requirements suit an approved tutor (Sprint_4.md, matching rules)."""

from django.db.models import Q

from .models import Requirement
from .services import live_cutoff


def matching_requirements(profile):
    """
    Open, not expired, in an area the tutor teaches in, for a class level and at least one
    subject they teach, and with a gender preference the tutor meets.
    """
    return (
        Requirement.objects.filter(
            status=Requirement.Status.OPEN,
            published_at__gt=live_cutoff(),
            area__in=profile.areas.all(),
            class_level__in=profile.class_levels.all(),
            subjects__in=profile.subjects.all(),
        )
        .filter(Q(preferred_gender=Requirement.Gender.ANY) | Q(preferred_gender=profile.gender))
        .select_related("class_level", "area")
        .prefetch_related("subjects")
        .distinct()
        .order_by("-published_at")
    )


def budget_fits(requirement, profile):
    """False only when both sides gave numbers and the ranges do not touch."""
    if requirement.budget_max is not None and profile.fee_min is not None:
        if requirement.budget_max < profile.fee_min:
            return False
    if requirement.budget_min is not None and profile.fee_max is not None:
        if requirement.budget_min > profile.fee_max:
            return False
    return True
