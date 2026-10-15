"""
The rules for applying, shortlisting and booking a demo. One place, so the API and the Django
admin cannot disagree. Every failure is a MatchingError whose `code` becomes the API error code.
"""

from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.guardians.matching import matching_requirements
from apps.notifications.models import Notification
from apps.notifications.services import notify

from .models import ContactUnlock, Match, TutorApplication

Status = TutorApplication.Status


class MatchingError(Exception):
    def __init__(self, code, message, status=409):
        super().__init__(message)
        self.code = code
        self.status = status


def apply(profile, requirement_id, message=""):
    """
    An approved tutor applies to an open requirement that suits them (the same rule that lists it
    for them). One application per tutor per requirement.
    """
    requirement = (
        matching_requirements(profile).select_related("guardian__user").filter(pk=requirement_id)
    ).first()
    if requirement is None:
        raise MatchingError("requirement_not_found", "This requirement is not open to you.", 404)
    try:
        with transaction.atomic():
            application = TutorApplication.objects.create(
                tutor=profile, requirement=requirement, message=message
            )
            notify(
                requirement.guardian.user,
                Notification.Kind.APPLICATION_RECEIVED,
                requirement_id=str(requirement.pk),
            )
    except IntegrityError:
        raise MatchingError("already_applied", "You already applied to this requirement.") from None
    return application


def live_requirement(application):
    """Decisions only make sense while the requirement is open."""
    requirement = application.requirement
    if requirement.status != "open" or requirement.is_expired:
        raise MatchingError("requirement_not_open", "This requirement is no longer open.")
    return requirement


def mark_viewed(requirement):
    """The guardian opened the list: everything new becomes 'viewed' (the tutor can see that)."""
    requirement.applications.filter(status=Status.APPLIED).update(status=Status.VIEWED)


@transaction.atomic
def shortlist(application):
    application = TutorApplication.objects.select_for_update().get(pk=application.pk)
    live_requirement(application)
    if application.status == Status.SHORTLISTED:
        raise MatchingError("already_shortlisted", "This tutor is already shortlisted.")
    application.status = Status.SHORTLISTED
    application.save(update_fields=["status", "updated_at"])
    notify(
        application.tutor.user,
        Notification.Kind.APPLICATION_SHORTLISTED,
        requirement_id=str(application.requirement_id),
    )
    return application


@transaction.atomic
def reject(application):
    application = TutorApplication.objects.select_for_update().get(pk=application.pk)
    live_requirement(application)
    if hasattr(application, "match"):
        raise MatchingError("demo_booked", "A demo is already booked with this tutor.")
    if application.status == Status.REJECTED:
        raise MatchingError("already_rejected", "This application is already rejected.")
    application.status = Status.REJECTED
    application.save(update_fields=["status", "updated_at"])
    notify(
        application.tutor.user,
        Notification.Kind.APPLICATION_REJECTED,
        requirement_id=str(application.requirement_id),
    )
    return application


def contact_of(user):
    """What the other side gets once contact opens. Phone-only accounts have no email."""
    return {"name": user.full_name, "phone": user.phone, "email": user.email}


def unlock_fee_required():
    return settings.UNLOCK_FEE_ENABLED


def _when(demo_at):
    return timezone.localtime(demo_at).strftime("%a %d %b, %I:%M %p")


@transaction.atomic
def book_demo(application, demo_at, by):
    """
    Book (or move) the demo for a shortlisted tutor. Contact opens now unless the unlock fee is
    on: then it waits for the payment (Sprint 6) and the row is created there.
    """
    application = TutorApplication.objects.select_for_update().get(pk=application.pk)
    requirement = live_requirement(application)
    if application.status != Status.SHORTLISTED:
        raise MatchingError("not_shortlisted", "Shortlist the tutor before booking a demo.")
    now = timezone.now()
    if not (
        now + timedelta(hours=settings.DEMO_MIN_LEAD_HOURS)
        <= demo_at
        <= now + timedelta(days=settings.DEMO_MAX_DAYS_AHEAD)
    ):
        raise MatchingError(
            "invalid_demo_time",
            f"Pick a time between {settings.DEMO_MIN_LEAD_HOURS} hour and "
            f"{settings.DEMO_MAX_DAYS_AHEAD} days from now.",
            status=400,
        )
    match, _ = Match.objects.update_or_create(
        requirement=requirement,
        tutor=application.tutor,
        defaults={"application": application, "demo_at": demo_at, "booked_by": by},
    )
    if not unlock_fee_required() and not hasattr(match, "unlock"):
        ContactUnlock.objects.create(match=match, tutor=application.tutor, requirement=requirement)
    data = {"requirement_id": str(requirement.pk), "demo_at": demo_at.isoformat()}
    data["when"] = _when(demo_at)
    notify(
        application.tutor.user,
        Notification.Kind.DEMO_BOOKED,
        demo_path="/tutor/applications",
        **data,
    )
    notify(
        requirement.guardian.user,
        Notification.Kind.DEMO_BOOKED,
        demo_path=f"/requirements/{requirement.pk}/applicants",
        **data,
    )
    return application
