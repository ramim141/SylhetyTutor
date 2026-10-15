"""
Commission after a confirmed tuition (Architecture Doc 8.8, Sprint_6.md): created when the guardian
says yes, due a week later, reminded at 14 days, and at 21 days unpaid the tutor cannot apply for
new tuition until it is paid. Every number comes from settings, none is written here.
"""

from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.notifications.models import Notification
from apps.notifications.services import notify

from .models import Commission, Payment
from .services import PaymentError, gateway

PAGE = "/tutor/payments"


def is_founding(profile, today=None):
    today = today or timezone.localdate()
    return bool(profile.founding_until and profile.founding_until >= today)


def on_confirmed(sender, match, **kwargs):
    """`match_confirmed` listener: open the commission (or waive it for a founding tutor)."""
    if Commission.objects.filter(match=match).exists():
        return None
    profile = match.tutor
    today = timezone.localdate()
    waived = is_founding(profile, today)
    commission = Commission.objects.create(
        match=match,
        tutor=profile,
        amount=settings.COMMISSION_AMOUNT,
        due_date=today + timedelta(days=settings.COMMISSION_DUE_DAYS),
        status=Commission.Status.WAIVED if waived else Commission.Status.PENDING,
        note="Founding tutor" if waived else "",
    )
    if not waived:
        notify(profile.user, Notification.Kind.COMMISSION_DUE, path=PAGE)
    return commission


def lift_suspension(profile):
    """Applying resumes once nothing is left that is past the suspension limit."""
    if not profile.suspended_at:
        return
    cutoff = timezone.now() - timedelta(days=settings.COMMISSION_SUSPEND_DAYS)
    overdue = profile.commissions.filter(status=Commission.Status.PENDING, created_at__lte=cutoff)
    if not overdue.exists():
        profile.suspended_at = None
        profile.save(update_fields=["suspended_at", "updated_at"])


def settle(commission, *, payment=None, note=""):
    commission.status = Commission.Status.PAID
    commission.payment = payment
    commission.paid_at = timezone.now()
    if note:
        commission.note = note
    commission.save()
    lift_suspension(commission.tutor)


def fulfil(payment):
    """A verified commission payment settles the commission it was for."""
    commission = Commission.objects.select_for_update().get(pk=payment.commission_id)
    if commission.status == Commission.Status.PENDING:
        settle(commission, payment=payment)


@transaction.atomic
def submit(commission, user, transaction_id, sender_number):
    commission = Commission.objects.select_for_update().get(pk=commission.pk)
    if commission.tutor.user_id != user.pk:
        raise PaymentError("not_found", "No such commission.", 404)
    if commission.status != Commission.Status.PENDING:
        raise PaymentError("not_payable", "This commission is not due.")
    if commission.payments.filter(status=Payment.Status.PENDING).exists():
        raise PaymentError("payment_pending", "Your payment is waiting for verification.")
    payment = gateway.submit(
        user=user,
        purpose=Payment.Purpose.COMMISSION,
        amount=commission.amount,
        transaction_id=transaction_id,
        sender_number=sender_number,
        match=commission.match,
    )
    payment.commission = commission
    payment.save(update_fields=["commission"])
    return payment


@transaction.atomic
def mark_paid(commission, by, note="Paid outside the app"):
    """One click for an admin who received the money some other way."""
    commission = Commission.objects.select_for_update().get(pk=commission.pk)
    if commission.status != Commission.Status.PENDING:
        raise PaymentError("not_payable", "This commission is not due.")
    settle(commission, note=note[:300])
    notify(
        commission.tutor.user, Notification.Kind.PAYMENT_VERIFIED, purpose="commission", path=PAGE
    )
    return commission


@transaction.atomic
def waive(commission, by, reason):
    reason = (reason or "").strip()
    if len(reason) < 5:
        raise PaymentError("reason_too_short", "Write at least 5 characters.", 400)
    commission = Commission.objects.select_for_update().get(pk=commission.pk)
    if commission.status != Commission.Status.PENDING:
        raise PaymentError("not_payable", "This commission is not due.")
    commission.status = Commission.Status.WAIVED
    commission.note = reason[:300]
    commission.save()
    lift_suspension(commission.tutor)
    return commission


def process(now=None):
    """The daily pass: remind at 14 days, suspend at 21. Returns (reminded, suspended)."""
    now = now or timezone.now()
    reminded = suspended = 0
    pending = Commission.objects.filter(status=Commission.Status.PENDING).select_related(
        "tutor__user"
    )
    for commission in pending:
        age = now - commission.created_at
        profile = commission.tutor
        if age >= timedelta(days=settings.COMMISSION_SUSPEND_DAYS) and not profile.suspended_at:
            profile.suspended_at = now
            profile.save(update_fields=["suspended_at", "updated_at"])
            notify(profile.user, Notification.Kind.ACCOUNT_SUSPENDED, path=PAGE)
            suspended += 1
        if age >= timedelta(days=settings.COMMISSION_REMINDER_DAYS) and not commission.reminded_at:
            commission.reminded_at = now
            commission.save(update_fields=["reminded_at"])
            notify(profile.user, Notification.Kind.COMMISSION_REMINDER, path=PAGE)
            reminded += 1
    return reminded, suspended
