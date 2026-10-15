"""Unlock fee by bKash: submit a TrxID, admin verifies, only then contact opens."""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.matching.models import ContactUnlock
from apps.matching.tests.helpers import (
    approved_tutor,
    client_for,
    make_lookups,
    make_user,
    open_requirement,
)
from apps.notifications.models import Notification
from apps.payments.models import Payment

pytestmark = pytest.mark.django_db

GUARDIAN_PHONE = "01711111111"
TUTOR_PHONE = "01722222222"
PAYMENTS = "/api/v1/admin/payments/"


@pytest.fixture
def fee_world(settings):
    """A guardian and tutor with a booked demo while the unlock fee is switched on."""
    settings.UNLOCK_FEE_ENABLED = True
    make_lookups()
    guardian = make_user("guardian", GUARDIAN_PHONE, name="Karim Guardian")
    guardian_client = client_for(guardian)
    requirement_id = open_requirement(guardian_client)
    tutor_client, profile = approved_tutor(phone=TUTOR_PHONE)
    application_id = tutor_client.post(f"/api/v1/tutors/me/apply/{requirement_id}/", {}).json()[
        "id"
    ]
    guardian_client.post(f"/api/v1/applications/{application_id}/shortlist/")
    when = (timezone.now() + timedelta(days=2)).isoformat()
    booked = guardian_client.post(
        f"/api/v1/applications/{application_id}/book-demo/", {"demo_at": when}
    )
    assert booked.status_code == 200
    admin = client_for(make_user("admin", "01799999999", name="Admin"))
    return guardian_client, tutor_client, profile, application_id, admin


def pay(tutor, application_id, trx="8N7A6D5EE1", sender="01733333333"):
    return tutor.post(
        f"/api/v1/tutors/me/applications/{application_id}/pay-unlock/",
        {"transaction_id": trx, "sender_number": sender},
    )


def mine(tutor):
    return tutor.get("/api/v1/tutors/me/applications/").json()[0]


def test_with_the_fee_on_nobody_sees_a_phone_until_it_is_verified(fee_world):
    guardian, tutor, _, application_id, admin = fee_world
    before = mine(tutor)
    assert before["contact"] is None and before["unlock_fee"] == 150 and before["payment"] is None

    response = pay(tutor, application_id)
    assert response.status_code == 201
    assert response.json()["status"] == "pending" and response.json()["amount"] == 150
    waiting = mine(tutor)
    assert waiting["contact"] is None and waiting["payment"]["status"] == "pending"
    assert not ContactUnlock.objects.exists()

    payment_id = response.json()["id"]
    assert admin.post(f"{PAYMENTS}{payment_id}/verify/").status_code == 200

    opened = mine(tutor)
    assert (
        opened["contact"]["phone"] == GUARDIAN_PHONE and opened["payment"]["status"] == "verified"
    )
    unlock = ContactUnlock.objects.get()
    assert unlock.fee_paid == 150 and str(unlock.payment_id) == payment_id
    seen = guardian.get(f"/api/v1/requirements/{opened['requirement']['id']}/applications/").json()
    assert seen[0]["contact"]["phone"] == TUTOR_PHONE


def test_verifying_tells_the_tutor_and_the_guardian_without_contact_details(fee_world):
    guardian, tutor, profile, application_id, admin = fee_world
    payment_id = pay(tutor, application_id).json()["id"]
    admin.post(f"{PAYMENTS}{payment_id}/verify/")
    note = Notification.objects.get(user=profile.user, kind="payment_verified")
    assert note.data == {"purpose": "unlock", "path": "/tutor/applications"}
    assert (
        Notification.objects.filter(user__phone=GUARDIAN_PHONE, kind="demo_booked").count() == 2
    )  # at booking, and again when contact opens
    assert TUTOR_PHONE not in str(Notification.objects.values_list("data", flat=True))


def test_a_payment_can_only_be_decided_once(fee_world):
    _, tutor, _, application_id, admin = fee_world
    payment_id = pay(tutor, application_id).json()["id"]
    assert admin.post(f"{PAYMENTS}{payment_id}/verify/").status_code == 200
    again = admin.post(f"{PAYMENTS}{payment_id}/verify/")
    assert again.status_code == 409 and again.json()["code"] == "not_pending"
    assert (
        admin.post(f"{PAYMENTS}{payment_id}/reject/", {"reason": "too late now"}).status_code == 409
    )
    assert ContactUnlock.objects.count() == 1


def test_a_rejected_payment_needs_a_reason_and_the_tutor_may_try_again(fee_world):
    _, tutor, profile, application_id, admin = fee_world
    payment_id = pay(tutor, application_id).json()["id"]
    short = admin.post(f"{PAYMENTS}{payment_id}/reject/", {"reason": "no"})
    assert short.status_code == 400 and short.json()["fields"]["reason"][0]["code"]
    assert (
        admin.post(
            f"{PAYMENTS}{payment_id}/reject/", {"reason": "TrxID not found in bKash"}
        ).status_code
        == 200
    )

    seen = mine(tutor)
    assert seen["payment"]["status"] == "rejected"
    assert seen["payment"]["reject_reason"] == "TrxID not found in bKash"
    assert seen["contact"] is None
    note = Notification.objects.get(user=profile.user, kind="payment_rejected")
    assert note.data["reason"] == "TrxID not found in bKash"

    # the same TrxID is burned; a new one is accepted
    assert pay(tutor, application_id, trx="8N7A6D5EE1").json()["code"] == "trx_already_used"
    assert pay(tutor, application_id, trx="9Z8Y7X6W5V").status_code == 201


def test_submit_rules(fee_world):
    guardian, tutor, _, application_id, _ = fee_world
    assert pay(tutor, application_id, trx="short").json()["code"] == "invalid_transaction_id"
    assert pay(tutor, application_id, trx="bad id!!!!!!").status_code == 400
    assert pay(tutor, application_id, sender="12345").json()["code"] == "invalid_sender_number"
    assert pay(tutor, application_id, trx=" 8n7a 6d5ee1 ").status_code == 201  # tidied
    assert Payment.objects.get().transaction_id == "8N7A6D5EE1"
    again = pay(tutor, application_id, trx="AAAAAAAA11")
    assert again.status_code == 409 and again.json()["code"] == "payment_pending"


def test_only_the_owner_tutor_can_pay(fee_world):
    guardian, tutor, _, application_id, _ = fee_world
    other, _ = approved_tutor(phone="01744444444", name="Other")
    assert pay(other, application_id).status_code == 404
    assert pay(guardian, application_id).status_code == 403
    assert pay(APIClient(), application_id).status_code == 401


def test_with_the_fee_off_there_is_nothing_to_pay(settings):
    settings.UNLOCK_FEE_ENABLED = False
    make_lookups()
    guardian_client = client_for(make_user("guardian", GUARDIAN_PHONE))
    requirement_id = open_requirement(guardian_client)
    tutor, _ = approved_tutor(phone=TUTOR_PHONE)
    application_id = tutor.post(f"/api/v1/tutors/me/apply/{requirement_id}/", {}).json()["id"]
    guardian_client.post(f"/api/v1/applications/{application_id}/shortlist/")
    when = (timezone.now() + timedelta(days=2)).isoformat()
    guardian_client.post(f"/api/v1/applications/{application_id}/book-demo/", {"demo_at": when})
    response = pay(tutor, application_id)
    assert response.status_code == 409 and response.json()["code"] == "fee_not_required"


def test_admin_queue_lists_pending_first_with_counts_and_is_admin_only(fee_world):
    guardian, tutor, _, application_id, admin = fee_world
    pay(tutor, application_id)
    listing = admin.get(PAYMENTS).json()
    assert listing["counts"] == {"pending": 1, "verified": 0, "rejected": 0}
    row = listing["results"][0]
    assert row["transaction_id"] == "8N7A6D5EE1" and row["tutor_phone"] == TUTOR_PHONE
    assert admin.get(f"{PAYMENTS}?status=verified").json()["results"] == []
    for client, code in ((APIClient(), 401), (tutor, 403), (guardian, 403)):
        assert client.get(PAYMENTS).status_code == code
        assert client.post(f"{PAYMENTS}{row['id']}/verify/").status_code == code
    assert Payment.objects.get().status == "pending"


def test_payment_info_is_for_tutors_and_has_the_number(fee_world, settings):
    guardian, tutor, *_ = fee_world
    body = tutor.get("/api/v1/payments/info/").json()
    assert body["number"] == settings.BKASH_NUMBER and body["unlock_fee"] == 150
    assert guardian.get("/api/v1/payments/info/").status_code == 403


def test_my_payments_shows_only_mine(fee_world):
    _, tutor, _, application_id, _ = fee_world
    pay(tutor, application_id)
    other, _ = approved_tutor(phone="01744444444", name="Other")
    assert len(tutor.get("/api/v1/tutors/me/payments/").json()) == 1
    assert other.get("/api/v1/tutors/me/payments/").json() == []
    assert "sender_number" not in tutor.get("/api/v1/tutors/me/payments/").json()[0]
