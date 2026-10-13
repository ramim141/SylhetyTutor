"""
Admin decisions on a submitted tutor profile (Sprint Plan, Sprint 4).

One place for the rules, used by the Django admin: only a pending profile can be approved, a
rejection needs a reason the tutor can act on, and every decision is recorded and told to the
tutor. Everything happens in one transaction, so a profile is never approved without its audit
row or its notification.
"""

from django.db import transaction
from django.utils import timezone

from apps.notifications.models import Notification
from apps.notifications.services import notify

from .models import TutorProfile, VerificationEvent

Status = TutorProfile.VerificationStatus


class ReviewError(Exception):
    """The decision is not allowed; the message is safe to show to the admin."""


def record_submission(profile, actor):
    VerificationEvent.objects.create(
        profile=profile, action=VerificationEvent.Action.SUBMITTED, actor=actor
    )


@transaction.atomic
def approve(profile, admin_user):
    profile = TutorProfile.objects.select_for_update().get(pk=profile.pk)
    if profile.verification_status != Status.PENDING:
        raise ReviewError("Only a pending profile can be approved.")
    gaps = [name for name in profile.missing_fields() if name in profile.REQUIRED_FIELDS]
    if gaps:
        raise ReviewError("The profile is incomplete: " + ", ".join(gaps))
    profile.verification_status = Status.APPROVED
    profile.verified_at = timezone.now()
    profile.verified_by = admin_user
    profile.rejection_reason = ""
    profile.save()  # also gives it its public address (slug) the first time
    VerificationEvent.objects.create(
        profile=profile, action=VerificationEvent.Action.APPROVED, actor=admin_user
    )
    notify(profile.user, Notification.Kind.PROFILE_APPROVED)
    return profile


@transaction.atomic
def reject(profile, admin_user, reason):
    reason = (reason or "").strip()
    if not reason:
        raise ReviewError("Write the reason: the tutor sees it and must know what to fix.")
    profile = TutorProfile.objects.select_for_update().get(pk=profile.pk)
    if profile.verification_status not in (Status.PENDING, Status.APPROVED):
        raise ReviewError("Only a pending or approved profile can be rejected.")
    profile.verification_status = Status.REJECTED
    profile.rejection_reason = reason
    profile.verified_at = None
    profile.verified_by = None
    profile.save(
        update_fields=[
            "verification_status",
            "rejection_reason",
            "verified_at",
            "verified_by",
            "updated_at",
        ]
    )
    VerificationEvent.objects.create(
        profile=profile,
        action=VerificationEvent.Action.REJECTED,
        actor=admin_user,
        reason=reason,
    )
    notify(profile.user, Notification.Kind.PROFILE_REJECTED, reason=reason)
    return profile
