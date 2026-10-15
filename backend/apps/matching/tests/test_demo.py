"""Demo booking and the moment contact opens (Architecture Doc 8.8)."""

from datetime import timedelta

import pytest
from django.core import mail
from django.utils import timezone

from apps.matching.models import ContactUnlock, Match
from apps.notifications.models import Notification

from .helpers import approved_tutor, client_for, make_lookups, make_user, open_requirement

pytestmark = pytest.mark.django_db

GUARDIAN_PHONE = "01711111111"
TUTOR_PHONE = "01722222222"


def in_days(days=2, hours=0):
    return (timezone.now() + timedelta(days=days, hours=hours)).isoformat()


@pytest.fixture
def world():
    make_lookups()
    guardian = make_user(
        "guardian", GUARDIAN_PHONE, name="Karim Guardian", email="karim@example.com"
    )
    guardian_client = client_for(guardian)
    requirement_id = open_requirement(guardian_client)
    tutor_client, profile = approved_tutor(phone=TUTOR_PHONE)
    application_id = tutor_client.post(
        f"/api/v1/tutors/me/apply/{requirement_id}/", {"message": "hi"}
    ).json()["id"]
    return guardian_client, requirement_id, tutor_client, profile, application_id


def book(client, application_id, when=None):
    return client.post(f"/api/v1/applications/{application_id}/book-demo/", {"demo_at": when})


def shortlist(client, application_id):
    assert client.post(f"/api/v1/applications/{application_id}/shortlist/").status_code == 200


def mine(tutor):
    return tutor.get("/api/v1/tutors/me/applications/").json()[0]


def test_nobody_has_a_phone_number_before_a_demo_is_booked(world):
    guardian, requirement_id, tutor, _, application_id = world
    shortlist(guardian, application_id)
    seen = [
        tutor.get("/api/v1/tutors/me/applications/").content.decode(),
        tutor.get("/api/v1/requirements/matching/").content.decode(),
        guardian.get(f"/api/v1/requirements/{requirement_id}/applications/").content.decode(),
    ]
    for body in seen:
        assert GUARDIAN_PHONE not in body and TUTOR_PHONE not in body
        assert "karim@example.com" not in body
    assert mine(tutor)["contact"] is None and mine(tutor)["demo_at"] is None


def test_booking_a_demo_opens_contact_for_both_and_logs_it(world):
    guardian, requirement_id, tutor, profile, application_id = world
    shortlist(guardian, application_id)
    when = in_days(2)
    response = book(guardian, application_id, when)
    assert response.status_code == 200, response.json()
    body = response.json()
    assert body["demo_at"] and body["unlock_fee"] is None
    assert body["contact"] == {"name": "Rahim Uddin", "phone": TUTOR_PHONE, "email": None}

    seen = mine(tutor)
    assert seen["demo_at"] and seen["contact"]["phone"] == GUARDIAN_PHONE
    assert seen["contact"]["name"] == "Karim Guardian"
    # the requirement itself still carries nothing about the guardian
    assert GUARDIAN_PHONE not in str(seen["requirement"])

    unlock = ContactUnlock.objects.get()
    assert unlock.tutor == profile and str(unlock.requirement_id) == requirement_id
    assert unlock.fee_paid == 0 and unlock.unlocked_at is not None
    assert Match.objects.get().status == "trial_scheduled"


def test_both_sides_are_notified_without_contact_details(world, django_capture_on_commit_callbacks):
    guardian, requirement_id, tutor, profile, application_id = world
    shortlist(guardian, application_id)
    mail.outbox.clear()
    with django_capture_on_commit_callbacks(execute=True):
        book(guardian, application_id, in_days(2))
    kinds = Notification.objects.filter(kind="demo_booked")
    assert kinds.count() == 2
    assert {n.user_id for n in kinds} == {profile.user_id, guardian_user_id(guardian)}
    for message in mail.outbox:
        assert GUARDIAN_PHONE not in message.body and TUTOR_PHONE not in message.body


def guardian_user_id(client):
    return client.handler._force_user.pk


def test_booking_needs_a_shortlisted_tutor(world):
    guardian, _, _, _, application_id = world
    response = book(guardian, application_id, in_days(2))
    assert response.status_code == 409 and response.json()["code"] == "not_shortlisted"
    assert not Match.objects.exists() and not ContactUnlock.objects.exists()


@pytest.mark.parametrize(
    "when",
    [
        lambda: (timezone.now() - timedelta(days=1)).isoformat(),
        lambda: (timezone.now() + timedelta(minutes=10)).isoformat(),
        lambda: (timezone.now() + timedelta(days=45)).isoformat(),
    ],
    ids=["past", "too-soon", "too-far"],
)
def test_the_demo_time_must_be_in_a_sensible_window(world, when):
    guardian, _, _, _, application_id = world
    shortlist(guardian, application_id)
    response = book(guardian, application_id, when())
    assert response.status_code == 400 and response.json()["code"] == "invalid_demo_time"
    assert not Match.objects.exists()


def test_a_missing_or_malformed_time_is_a_validation_error(world):
    guardian, _, _, _, application_id = world
    shortlist(guardian, application_id)
    assert book(guardian, application_id, None).status_code == 400
    assert book(guardian, application_id, "tomorrow evening").status_code == 400


def test_moving_the_demo_keeps_one_match_and_one_unlock(world):
    guardian, _, tutor, _, application_id = world
    shortlist(guardian, application_id)
    book(guardian, application_id, in_days(2))
    first = mine(tutor)["demo_at"]
    assert book(guardian, application_id, in_days(3)).status_code == 200
    assert Match.objects.count() == 1 and ContactUnlock.objects.count() == 1
    assert mine(tutor)["demo_at"] != first


def test_a_booked_tutor_cannot_be_rejected(world):
    guardian, _, _, _, application_id = world
    shortlist(guardian, application_id)
    book(guardian, application_id, in_days(2))
    response = guardian.post(f"/api/v1/applications/{application_id}/reject/")
    assert response.status_code == 409 and response.json()["code"] == "demo_booked"


def test_with_the_fee_on_a_booked_demo_does_not_open_contact(world, settings):
    settings.UNLOCK_FEE_ENABLED = True
    guardian, _, tutor, _, application_id = world
    shortlist(guardian, application_id)
    body = book(guardian, application_id, in_days(2)).json()
    assert body["contact"] is None and body["unlock_fee"] == settings.UNLOCK_FEE_AMOUNT
    seen = mine(tutor)
    assert seen["contact"] is None and seen["unlock_fee"] == settings.UNLOCK_FEE_AMOUNT
    assert seen["demo_at"]
    assert not ContactUnlock.objects.exists()


def test_the_fee_switch_is_off_by_default(settings):
    assert settings.UNLOCK_FEE_ENABLED is False


def test_someone_else_cannot_book_or_read_contact(world):
    guardian, requirement_id, tutor, _, application_id = world
    shortlist(guardian, application_id)
    intruder = client_for(make_user("guardian", "01788888888"))
    assert book(intruder, application_id, in_days(2)).status_code == 404
    assert book(tutor, application_id, in_days(2)).status_code == 403
    other_tutor, _ = approved_tutor(phone="01744444444", name="Other")
    book(guardian, application_id, in_days(2))
    # a different tutor sees none of it
    assert other_tutor.get("/api/v1/tutors/me/applications/").json() == []
    assert GUARDIAN_PHONE not in other_tutor.get("/api/v1/requirements/matching/").content.decode()
