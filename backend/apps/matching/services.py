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
