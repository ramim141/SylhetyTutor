"""
Asking the guardian "did the tuition start?" (Architecture Doc 8.8). The guardian is the verifier:
the tutor pays commission, so the guardian has no reason to lie. A few days after the demo they
get a link with a signed token (no login, one tap). No answer in a few more days: the match goes
on an admin's call list and an admin records what the guardian said.
"""

from datetime import timedelta

from django.conf import settings
from django.core import signing
from django.db import transaction
from django.utils import timezone

from apps.notifications.models import Notification
from apps.notifications.services import notify

from .models import Match
from .services import MatchingError
from .signals import match_confirmed

SALT = "tuition-confirmation"


def make_token(match):
    return signing.dumps(str(match.pk), salt=SALT)


def match_from_token(token):
    """The match a link belongs to; a bad or old link is a 404 like any unknown address."""
    try:
        match_id = signing.loads(
            token, salt=SALT, max_age=settings.CONFIRMATION_LINK_MAX_AGE_DAYS * 86400
        )
        return Match.objects.select_related(
            "tutor__user", "requirement__guardian__user", "requirement__area"
        ).get(pk=match_id)
    except (signing.BadSignature, Match.DoesNotExist, ValueError):
        raise MatchingError("invalid_link", "This link is not valid any more.", 404) from None


def due_matches(now=None):
    """Demos old enough, with contact opened, that nobody asked the guardian about yet."""
    now = now or timezone.now()
    cutoff = now - timedelta(days=settings.CONFIRMATION_AFTER_DAYS)
    return Match.objects.filter(
        status=Match.Status.TRIAL_SCHEDULED,
        demo_at__lte=cutoff,
        confirmation_requested_at__isnull=True,
        unlock__isnull=False,
    ).select_related("requirement__guardian__user", "tutor__user")


def request_confirmation(match, now=None):
    now = now or timezone.now()
    with transaction.atomic():
        match = Match.objects.select_for_update().get(pk=match.pk)
        if match.confirmation_requested_at or match.status != Match.Status.TRIAL_SCHEDULED:
            return False
        match.confirmation_requested_at = now
        match.save(update_fields=["confirmation_requested_at", "updated_at"])
        notify(
            match.requirement.guardian.user,
            Notification.Kind.CONFIRM_TUITION,
            path=f"/confirm/{make_token(match)}",
        )
    return True


def call_list(now=None):
    """Asked, but no answer for a few days: an admin should phone the guardian."""
    now = now or timezone.now()
    cutoff = now - timedelta(days=settings.CONFIRMATION_CALL_AFTER_DAYS)
    return (
        Match.objects.filter(
            status=Match.Status.TRIAL_SCHEDULED,
            confirmation_requested_at__lte=cutoff,
        )
        .select_related("requirement__guardian__user", "requirement__area", "tutor__user")
        .order_by("confirmation_requested_at")
    )


@transaction.atomic
def answer(match, started, channel):
    """Record the guardian's answer once. `started` True confirms the tuition."""
    match = Match.objects.select_for_update().get(pk=match.pk)
    if match.status != Match.Status.TRIAL_SCHEDULED:
        raise MatchingError("already_answered", "This was already answered.")
    now = timezone.now()
    match.confirmation_answered_at = now
    match.confirmation_channel = channel
    if started:
        match.status = Match.Status.CONFIRMED
        match.guardian_confirmed_at = now
    else:
        match.status = Match.Status.DECLINED
    match.save()
    if started:
        match_confirmed.send(sender=Match, match=match)
    return match
