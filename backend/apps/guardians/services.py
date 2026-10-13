"""
Rules for posting and closing a requirement. One place, so the API and the Django admin cannot
disagree: limits are checked under a lock on the guardian row, so two quick requests cannot slip
past the "3 open" cap together.
"""

from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import GuardianProfile, Requirement

Status = Requirement.Status


class RequirementError(Exception):
    """`code` and `status` become the API error; `fields` lists what is missing."""

    def __init__(self, code, message, status=409, fields=None):
        super().__init__(message)
        self.code = code
        self.status = status
        self.fields = fields or []


def live_cutoff():
    return timezone.now() - timedelta(days=settings.REQUIREMENT_LIFETIME_DAYS)


def open_count(guardian):
    """Open and not yet expired: these are the ones that count against the limit."""
    return guardian.requirements.filter(status=Status.OPEN, published_at__gt=live_cutoff()).count()


@transaction.atomic
def create_draft(guardian, subjects=(), **data):
    GuardianProfile.objects.select_for_update().get(pk=guardian.pk)
    drafts = guardian.requirements.filter(status=Status.DRAFT).count()
    if drafts >= settings.MAX_DRAFT_REQUIREMENTS:
        raise RequirementError(
            "too_many_drafts", f"You can keep at most {settings.MAX_DRAFT_REQUIREMENTS} drafts."
        )
    requirement = Requirement.objects.create(guardian=guardian, **data)
    requirement.subjects.set(subjects)
    return requirement


@transaction.atomic
def publish(requirement):
    GuardianProfile.objects.select_for_update().get(pk=requirement.guardian_id)
    requirement = Requirement.objects.select_for_update().get(pk=requirement.pk)
    if requirement.status == Status.OPEN and not requirement.is_expired:
        raise RequirementError("already_open", "This requirement is already published.")
    gaps = requirement.missing_fields()
    if gaps:
        raise RequirementError(
            "incomplete_requirement", "Fill in: " + ", ".join(gaps), status=400, fields=gaps
        )
    if open_count(requirement.guardian) >= settings.MAX_OPEN_REQUIREMENTS:
        raise RequirementError(
            "too_many_open",
            f"You can have at most {settings.MAX_OPEN_REQUIREMENTS} open requirements. "
            "Close one first.",
        )
    requirement.status = Status.OPEN
    requirement.published_at = timezone.now()
    requirement.closed_at = None
    requirement.close_reason = ""
    requirement.save()
    return requirement


@transaction.atomic
def close(requirement, reason=""):
    requirement = Requirement.objects.select_for_update().get(pk=requirement.pk)
    if requirement.status != Status.OPEN:
        raise RequirementError("not_open", "Only an open requirement can be closed.")
    if reason not in Requirement.CloseReason.values:
        reason = Requirement.CloseReason.OTHER
    requirement.status = Status.CLOSED
    requirement.closed_at = timezone.now()
    requirement.close_reason = reason
    requirement.save()
    return requirement
