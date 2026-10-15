"""
Submitting and verifying payments. `ManualBkash` is the only gateway today: the tutor sends money
and tells us the TrxID, an admin checks it by hand. When a bKash merchant API exists, another class
with the same three methods replaces it and nothing else changes (`gateway` below).
"""

import re

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.accounts.validators import normalize_phone
from apps.matching.models import ContactUnlock
from apps.notifications.models import Notification
from apps.notifications.services import notify

from .models import Payment

TRX_ID = re.compile(r"^[A-Z0-9]{8,12}$")
REASON_MIN, REASON_MAX = 5, 300


# where the tutor lands from a notification about each kind of payment
PAGES = {"unlock": "/tutor/applications", "commission": "/tutor/payments"}


class PaymentError(Exception):
    """`code` and `status` become the API error."""

    def __init__(self, code, message, status=409):
        super().__init__(message)
        self.code = code
        self.status = status


def clean_trx_id(raw):
    trx = re.sub(r"\s+", "", str(raw or "")).upper()
    if not TRX_ID.match(trx):
        raise PaymentError("invalid_transaction_id", "TrxID is 8-12 letters and digits.", 400)
    return trx


def clean_sender(raw):
    number = normalize_phone(str(raw or ""))
    if not re.fullmatch(r"01[3-9]\d{8}", number or ""):
        raise PaymentError("invalid_sender_number", "Enter the bKash number you paid from.", 400)
    return number


def clean_reason(raw):
    reason = (raw or "").strip()
    if len(reason) < REASON_MIN:
        raise PaymentError("reason_too_short", f"Write at least {REASON_MIN} characters.", 400)
    return reason[:REASON_MAX]


class ManualBkash:
    """Tutor pays by Send Money to our number; an admin matches the TrxID by hand."""

    def instructions(self):
        return {"method": "bkash", "number": settings.BKASH_NUMBER, "kind": "send_money"}

    @transaction.atomic
    def submit(self, *, user, purpose, amount, transaction_id, sender_number, match=None):
        trx = clean_trx_id(transaction_id)
        sender = clean_sender(sender_number)
        try:
            with transaction.atomic():
                return Payment.objects.create(
                    user=user,
                    purpose=purpose,
                    amount=amount,
                    sender_number=sender,
                    transaction_id=trx,
                    match=match,
                )
        except IntegrityError:
            raise PaymentError(
                "trx_already_used", "This TrxID was already submitted.", 409
            ) from None

    @transaction.atomic
    def verify(self, payment, by):
        payment = Payment.objects.select_for_update().get(pk=payment.pk)
        if payment.status != Payment.Status.PENDING:
            raise PaymentError("not_pending", "This payment was already decided.")
        payment.status = Payment.Status.VERIFIED
        payment.reviewed_by, payment.reviewed_at = by, timezone.now()
        payment.save(update_fields=["status", "reviewed_by", "reviewed_at"])
        FULFIL[payment.purpose](payment)
        notify(
            payment.user,
            Notification.Kind.PAYMENT_VERIFIED,
            purpose=payment.purpose,
            path=PAGES[payment.purpose],
        )
        return payment

    @transaction.atomic
    def reject(self, payment, by, reason):
        reason = clean_reason(reason)
        payment = Payment.objects.select_for_update().get(pk=payment.pk)
        if payment.status != Payment.Status.PENDING:
            raise PaymentError("not_pending", "This payment was already decided.")
        payment.status = Payment.Status.REJECTED
        payment.reject_reason = reason
        payment.reviewed_by, payment.reviewed_at = by, timezone.now()
        payment.save(update_fields=["status", "reject_reason", "reviewed_by", "reviewed_at"])
        notify(
            payment.user,
            Notification.Kind.PAYMENT_REJECTED,
            purpose=payment.purpose,
            reason=reason,
            path=PAGES[payment.purpose],
        )
        return payment


gateway = ManualBkash()


def fulfil_unlock(payment):
    """A verified unlock fee opens contact for both sides (the same row a free booking makes)."""
    match = payment.match
    unlock, created = ContactUnlock.objects.get_or_create(
        match=match,
        defaults={
            "tutor": match.tutor,
            "requirement": match.requirement,
            "fee_paid": payment.amount,
            "payment": payment,
        },
    )
    if created:
        from apps.matching.services import notify_demo

        notify_demo(match, only=match.requirement.guardian.user)
    return unlock


def fulfil_commission(payment):
    from . import commissions

    commissions.fulfil(payment)


# purpose -> what a verified payment of that kind does
FULFIL = {
    Payment.Purpose.UNLOCK: fulfil_unlock,
    Payment.Purpose.COMMISSION: fulfil_commission,
}


def submit_unlock(application, user, transaction_id, sender_number):
    """The tutor pays the unlock fee for a booked demo."""
    match = getattr(application, "match", None)
    if application.tutor.user_id != user.pk or match is None:
        raise PaymentError("no_booked_demo", "There is no booked demo to pay for.", 404)
    if not settings.UNLOCK_FEE_ENABLED:
        raise PaymentError("fee_not_required", "Contact opens without a fee.")
    if hasattr(match, "unlock"):
        raise PaymentError("already_unlocked", "Contact is already open.")
    if match.payments.filter(status=Payment.Status.PENDING).exists():
        raise PaymentError("payment_pending", "Your payment is waiting for verification.")
    return gateway.submit(
        user=user,
        purpose=Payment.Purpose.UNLOCK,
        amount=settings.UNLOCK_FEE_AMOUNT,
        transaction_id=transaction_id,
        sender_number=sender_number,
        match=match,
    )
