"""
The rules for applying, shortlisting and booking a demo. One place, so the API and the Django
admin cannot disagree. Every failure is a MatchingError whose `code` becomes the API error code.
"""

from django.db import IntegrityError, transaction

from apps.guardians.matching import matching_requirements
from apps.notifications.models import Notification
from apps.notifications.services import notify

from .models import TutorApplication

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
