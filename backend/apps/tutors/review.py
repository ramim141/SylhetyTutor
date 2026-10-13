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
    """
    The decision is not allowed. `code` and `status` become the API error; the message is safe
    to show to an admin. `fields` lists what is missing, for incomplete_profile.
    """

    def __init__(self, code, message, status=409, fields=None):
        super().__init__(message)
        self.code = code
        self.status = status
        self.fields = fields or []


REASON_MIN, REASON_MAX = 10, 500


def clean_reason(reason):
    reason = (reason or "").strip()
    if not reason:
        raise ReviewError("required", "Write the reason: the tutor sees it.", status=400)
    if len(reason) < REASON_MIN:
        raise ReviewError("too_short", f"Reason needs at least {REASON_MIN} characters.", 400)
    if len(reason) > REASON_MAX:
        raise ReviewError("too_long", f"Reason can be at most {REASON_MAX} characters.", 400)
    return reason


def record_submission(profile, actor):
    VerificationEvent.objects.create(
        profile=profile, action=VerificationEvent.Action.SUBMITTED, actor=actor
    )


def record_document_view(profile, actor, kind):
    """Who looked at an identity document, and when (never edited, only added)."""
    VerificationEvent.objects.create(
        profile=profile,
        action=VerificationEvent.Action.DOCUMENT_VIEWED,
        actor=actor,
        meta={"kind": kind},
    )


@transaction.atomic
def approve(profile, admin_user):
    profile = TutorProfile.objects.select_for_update().get(pk=profile.pk)
    if profile.user_id == admin_user.pk:
        raise ReviewError("self_approval", "You cannot approve your own profile.", status=403)
    if profile.verification_status != Status.PENDING:
        raise ReviewError("not_pending", "Only a pending profile can be approved.")
    gaps = [name for name in profile.missing_fields() if name in profile.REQUIRED_FIELDS]
    if gaps:
        raise ReviewError(
            "incomplete_profile", "The profile is incomplete: " + ", ".join(gaps), fields=gaps
        )
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
    reason = clean_reason(reason)
    profile = TutorProfile.objects.select_for_update().get(pk=profile.pk)
    if profile.user_id == admin_user.pk:
        raise ReviewError("self_approval", "You cannot review your own profile.", status=403)
    if profile.verification_status not in (Status.PENDING, Status.APPROVED):
        raise ReviewError("not_pending", "Only a pending or approved profile can be rejected.")
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
