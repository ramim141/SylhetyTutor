"""Commission: created on a confirmed tuition, paid by bKash, reminded, suspended, waived."""

from datetime import timedelta
from io import StringIO

import pytest
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.matching import confirmation
from apps.matching.models import Match
from apps.matching.tests.helpers import (
    approved_tutor,
    client_for,
    make_lookups,
    make_user,
    open_requirement,
)
from apps.notifications.models import Notification
from apps.payments.models import Commission, Payment

pytestmark = pytest.mark.django_db

MINE = "/api/v1/tutors/me/commissions/"
ADMIN = "/api/v1/admin/commissions/"
PAYMENTS = "/api/v1/admin/payments/"


@pytest.fixture
def world():
    """A guardian, a tutor and a booked demo (fee off). Not yet confirmed."""
    make_lookups()
    guardian = make_user("guardian", "01711111111", name="Karim Guardian")
    guardian_client = client_for(guardian)
    requirement_id = open_requirement(guardian_client)
    tutor, profile = approved_tutor(phone="01722222222", name="Rahim Uddin")
    application_id = tutor.post(f"/api/v1/tutors/me/apply/{requirement_id}/", {}).json()["id"]
    guardian_client.post(f"/api/v1/applications/{application_id}/shortlist/")
    when = (timezone.now() + timedelta(days=2)).isoformat()
    guardian_client.post(f"/api/v1/applications/{application_id}/book-demo/", {"demo_at": when})
    admin = client_for(make_user("admin", "01799999999", name="Admin"))
    return {
        "guardian": guardian_client,
        "tutor": tutor,
        "profile": profile,
        "match": Match.objects.get(),
        "admin": admin,
    }


def confirm(world, started=True):
    return confirmation.answer(world["match"], started, "link")


def pay(tutor, commission_id, trx="CM7A6D5EE1", sender="01733333333"):
    return tutor.post(
        f"{MINE}{commission_id}/pay/", {"transaction_id": trx, "sender_number": sender}
    )


def only_commission():
    return Commission.objects.get()


def run(command, *args):
    out = StringIO()
    call_command(command, *args, stdout=out)
    return out.getvalue()


# --- creation ------------------------------------------------------------------------------


def test_a_yes_creates_a_due_commission_and_tells_the_tutor(world, settings):
    settings.COMMISSION_AMOUNT = 800
    confirm(world)
    commission = only_commission()
    assert commission.status == "pending" and commission.amount == 800
    assert commission.due_date == timezone.localdate() + timedelta(
        days=settings.COMMISSION_DUE_DAYS
    )
    note = Notification.objects.get(user=world["profile"].user, kind="commission_due")
    assert note.data == {"path": "/tutor/payments"}


def test_a_no_creates_nothing(world):
    confirm(world, started=False)
    assert not Commission.objects.exists()


def test_a_founding_tutor_owes_nothing_while_it_lasts(world):
    world["profile"].founding_until = timezone.localdate() + timedelta(days=30)
    world["profile"].save()
    confirm(world)
    commission = only_commission()
    assert commission.status == "waived" and commission.note == "Founding tutor"
    assert not Notification.objects.filter(kind="commission_due").exists()


def test_an_expired_founding_period_does_not_waive(world):
    world["profile"].founding_until = timezone.localdate() - timedelta(days=1)
    world["profile"].save()
    confirm(world)
    assert only_commission().status == "pending"


def test_a_match_confirmed_twice_has_one_commission(world):
    confirm(world)
    from apps.matching.signals import match_confirmed

    match_confirmed.send(sender=Match, match=world["match"])
    assert Commission.objects.count() == 1


# --- paying --------------------------------------------------------------------------------


def test_the_tutor_pays_an_admin_verifies_and_the_commission_is_paid(world):
    confirm(world)
    commission = only_commission()
    response = pay(world["tutor"], commission.pk)
    assert response.status_code == 201 and response.json()["amount"] == 500
    assert response.json()["purpose"] == "commission"

    listing = world["tutor"].get(MINE).json()
    assert listing["suspended"] is False
    row = listing["results"][0]
    assert row["status"] == "pending" and row["payment"]["status"] == "pending"
    assert "guardian" not in str(row) and "01711111111" not in str(row)

    payment_id = response.json()["id"]
    assert world["admin"].post(f"{PAYMENTS}{payment_id}/verify/").status_code == 200
    commission.refresh_from_db()
    assert commission.status == "paid" and commission.paid_at is not None
    assert str(commission.payment_id) == payment_id
    note = Notification.objects.get(user=world["profile"].user, kind="payment_verified")
    assert note.data == {"purpose": "commission", "path": "/tutor/payments"}


def test_a_rejected_commission_payment_leaves_it_due_and_can_be_retried(world):
    confirm(world)
    commission = only_commission()
    payment_id = pay(world["tutor"], commission.pk).json()["id"]
    world["admin"].post(f"{PAYMENTS}{payment_id}/reject/", {"reason": "Amount does not match"})
    commission.refresh_from_db()
    assert commission.status == "pending"
    row = world["tutor"].get(MINE).json()["results"][0]
    assert row["payment"] == {"status": "rejected", "reject_reason": "Amount does not match"}
    assert pay(world["tutor"], commission.pk, trx="NEWTRX1234").status_code == 201


def test_commission_pay_rules(world):
    confirm(world)
    commission = only_commission()
    assert pay(world["tutor"], commission.pk, trx="bad").status_code == 400
    assert pay(world["tutor"], commission.pk).status_code == 201
    again = pay(world["tutor"], commission.pk, trx="OTHERTRX99")
    assert again.status_code == 409 and again.json()["code"] == "payment_pending"
    other, _ = approved_tutor(phone="01744444444", name="Other")
    assert pay(other, commission.pk, trx="OTHERTRX11").status_code == 404
    assert pay(world["guardian"], commission.pk, trx="OTHERTRX12").status_code == 403
    assert pay(APIClient(), commission.pk, trx="OTHERTRX13").status_code == 401


def test_a_paid_or_waived_commission_cannot_be_paid_again(world):
    confirm(world)
    commission = only_commission()
    world["admin"].post(f"{ADMIN}{commission.pk}/mark-paid/")
    response = pay(world["tutor"], commission.pk)
    assert response.status_code == 409 and response.json()["code"] == "not_payable"


def test_overdue_is_flagged_after_the_due_date(world):
    confirm(world)
    commission = only_commission()
    assert world["tutor"].get(MINE).json()["results"][0]["overdue"] is False
    Commission.objects.update(due_date=timezone.localdate() - timedelta(days=1))
    assert world["tutor"].get(MINE).json()["results"][0]["overdue"] is True
    commission.refresh_from_db()


def test_my_commissions_is_only_mine(world):
    confirm(world)
    other, _ = approved_tutor(phone="01744444444", name="Other")
    assert other.get(MINE).json() == {"suspended": False, "results": []}
    assert world["guardian"].get(MINE).status_code == 403
    assert APIClient().get(MINE).status_code == 401


# --- the daily pass ------------------------------------------------------------------------


def test_reminder_at_14_days_then_suspension_at_21(world):
    confirm(world)
    assert "0 reminder(s) sent, 0 tutor(s) suspended" in run(
        "process_commissions", "--days-ahead", "13"
    )

    assert "1 reminder(s) sent, 0 tutor(s) suspended" in run(
        "process_commissions", "--days-ahead", "14"
    )
    assert "0 reminder(s) sent, 0 tutor(s) suspended" in run(
        "process_commissions", "--days-ahead", "14"
    )
    assert Notification.objects.filter(kind="commission_reminder").count() == 1

    assert "0 reminder(s) sent, 1 tutor(s) suspended" in run(
        "process_commissions", "--days-ahead", "21"
    )
    assert "0 reminder(s) sent, 0 tutor(s) suspended" in run(
        "process_commissions", "--days-ahead", "30"
    )
    world["profile"].refresh_from_db()
    assert world["profile"].suspended_at is not None
    assert Notification.objects.filter(kind="account_suspended").count() == 1
    assert world["tutor"].get(MINE).json()["suspended"] is True


def test_a_paid_commission_is_never_chased(world):
    confirm(world)
    world["admin"].post(f"{ADMIN}{only_commission().pk}/mark-paid/")
    assert "0 reminder(s) sent, 0 tutor(s) suspended" in run(
        "process_commissions", "--days-ahead", "40"
    )


def test_a_suspended_tutor_cannot_apply_until_the_commission_is_paid(world):
    confirm(world)
    run("process_commissions", "--days-ahead", "21")
    second_guardian = client_for(make_user("guardian", "01788888888", name="Second Guardian"))
    second = open_requirement(second_guardian)

    def tutor():  # a fresh login: every real request loads the profile again
        return client_for(User.objects.get(pk=world["profile"].user_id))

    blocked = tutor().post(f"/api/v1/tutors/me/apply/{second}/", {})
    assert blocked.status_code == 403 and blocked.json()["code"] == "account_suspended"

    payment_id = pay(tutor(), only_commission().pk).json()["id"]
    assert world["admin"].post(f"{PAYMENTS}{payment_id}/verify/").status_code == 200
    world["profile"].refresh_from_db()
    assert world["profile"].suspended_at is None
    assert tutor().post(f"/api/v1/tutors/me/apply/{second}/", {}).status_code == 201


def test_waiving_lifts_a_suspension_too(world):
    confirm(world)
    run("process_commissions", "--days-ahead", "21")
    commission = only_commission()
    assert (
        world["admin"].post(f"{ADMIN}{commission.pk}/waive/", {"reason": "ok"}).status_code == 400
    )
    ok = world["admin"].post(
        f"{ADMIN}{commission.pk}/waive/", {"reason": "Guardian dispute settled"}
    )
    assert ok.status_code == 200 and ok.json()["status"] == "waived"
    world["profile"].refresh_from_db()
    assert world["profile"].suspended_at is None


# --- admin tracker -------------------------------------------------------------------------


def test_tracker_lists_due_first_with_counts_and_is_admin_only(world):
    confirm(world)
    listing = world["admin"].get(ADMIN).json()
    assert listing["counts"] == {"pending": 1, "paid": 0, "waived": 0, "disputed": 0}
    row = listing["results"][0]
    assert row["tutor_name"] == "Rahim Uddin" and row["tutor_phone"] == "01722222222"
    assert row["suspended"] is False
    assert world["admin"].get(f"{ADMIN}?status=paid").json()["results"] == []
    for client, code in ((APIClient(), 401), (world["tutor"], 403), (world["guardian"], 403)):
        assert client.get(ADMIN).status_code == code
        assert client.post(f"{ADMIN}{row['id']}/mark-paid/").status_code == code
    assert only_commission().status == "pending"


def test_mark_paid_is_one_click_and_once(world):
    confirm(world)
    commission = only_commission()
    ok = world["admin"].post(f"{ADMIN}{commission.pk}/mark-paid/")
    assert ok.status_code == 200 and ok.json()["status"] == "paid"
    assert world["admin"].post(f"{ADMIN}{commission.pk}/mark-paid/").status_code == 409
    assert Payment.objects.count() == 0  # nothing was invented to explain it
