"""Applying: who may, one per requirement, screened message, privacy of both sides."""

import pytest
from django.core import mail
from rest_framework.test import APIClient

from apps.matching.models import TutorApplication
from apps.notifications.models import Notification

from .helpers import approved_tutor, client_for, make_lookups, make_user, open_requirement

pytestmark = pytest.mark.django_db

MINE = "/api/v1/tutors/me/applications/"


def apply_url(requirement_id):
    return f"/api/v1/tutors/me/apply/{requirement_id}/"


@pytest.fixture
def world():
    make_lookups()
    guardian = make_user("guardian", "01711111111", name="Karim Guardian", email="g@example.com")
    guardian_client = client_for(guardian)
    requirement_id = open_requirement(guardian_client)
    tutor_client, profile = approved_tutor()
    return guardian, guardian_client, requirement_id, tutor_client, profile


def test_an_approved_tutor_can_apply_once(world):
    _, _, requirement_id, tutor, profile = world
    response = tutor.post(apply_url(requirement_id), {"message": "I teach HSC math"})
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "applied" and body["message"] == "I teach HSC math"
    assert TutorApplication.objects.filter(tutor=profile).count() == 1

    again = tutor.post(apply_url(requirement_id), {})
    assert again.status_code == 409 and again.json()["code"] == "already_applied"
    assert TutorApplication.objects.count() == 1


def test_the_message_is_optional(world):
    _, _, requirement_id, tutor, _ = world
    assert tutor.post(apply_url(requirement_id), {}).status_code == 201


@pytest.mark.parametrize(
    "message", ["call me 01712345678", "mail me a@b.com", "whatsapp me", "see www.x.com"]
)
def test_contact_details_in_the_message_are_refused(world, message):
    _, _, requirement_id, tutor, _ = world
    response = tutor.post(apply_url(requirement_id), {"message": message})
    assert response.status_code == 400
    assert response.json()["fields"]["message"][0]["code"] == "contact_not_allowed"
    assert not TutorApplication.objects.exists()


def test_a_message_over_300_characters_is_refused(world):
    _, _, requirement_id, tutor, _ = world
    assert tutor.post(apply_url(requirement_id), {"message": "a" * 301}).status_code == 400


def test_guest_guardian_admin_and_unapproved_tutor_cannot_apply(world):
    guardian, guardian_client, requirement_id, _, profile = world
    assert APIClient().post(apply_url(requirement_id), {}).status_code == 401
    assert guardian_client.post(apply_url(requirement_id), {}).status_code == 403
    admin = client_for(make_user("admin", "01799999999"))
    assert admin.post(apply_url(requirement_id), {}).status_code == 403
    pending, _ = approved_tutor(phone="01733333333")
    from apps.tutors.models import TutorProfile

    TutorProfile.objects.filter(user__phone="01733333333").update(verification_status="pending")
    fresh = client_for(type(guardian).objects.get(phone="01733333333"))
    assert fresh.post(apply_url(requirement_id), {}).status_code == 403


def test_a_requirement_that_does_not_suit_the_tutor_is_a_404(world):
    _, guardian_client, _, tutor, _ = world
    other = open_requirement(guardian_client, area="zindabazar")
    response = tutor.post(apply_url(other), {})
    assert response.status_code == 404 and response.json()["code"] == "requirement_not_found"


def test_a_closed_requirement_cannot_be_applied_to(world):
    _, guardian_client, requirement_id, tutor, _ = world
    guardian_client.post(f"/api/v1/requirements/{requirement_id}/close/", {})
    assert tutor.post(apply_url(requirement_id), {}).status_code == 404


def test_a_draft_requirement_cannot_be_applied_to(world):
    _, guardian_client, _, tutor, _ = world
    draft = guardian_client.post(
        "/api/v1/requirements/",
        {"class_level": "hsc", "area": "amberkhana", "subjects": ["math"]},
    ).json()["id"]
    assert tutor.post(apply_url(draft), {}).status_code == 404


def test_the_guardian_is_told_in_app_and_by_email(world, django_capture_on_commit_callbacks):
    guardian, _, requirement_id, tutor, _ = world
    with django_capture_on_commit_callbacks(execute=True):
        tutor.post(apply_url(requirement_id), {})
    note = Notification.objects.get(user=guardian)
    assert note.kind == "application_received"
    assert note.data == {"requirement_id": requirement_id}
    assert len(mail.outbox) == 1
    assert f"/requirements/{requirement_id}/applicants" in mail.outbox[0].body
    # no tutor name, no phone in the message
    assert "01722222222" not in mail.outbox[0].body


def test_my_applications_lists_only_mine_without_guardian_details(world):
    _, _, requirement_id, tutor, _ = world
    tutor.post(apply_url(requirement_id), {"message": "hello"})
    other, _ = approved_tutor(phone="01744444444", name="Other Tutor")
    other.post(apply_url(requirement_id), {})

    rows = tutor.get(MINE).json()
    assert len(rows) == 1 and rows[0]["message"] == "hello"
    text = str(rows)
    assert "01711111111" not in text and "Karim" not in text and "g@example.com" not in text
    assert "guardian" not in rows[0]["requirement"]


def test_my_applications_needs_a_tutor(world):
    _, guardian_client, *_ = world
    assert APIClient().get(MINE).status_code == 401
    assert guardian_client.get(MINE).status_code == 403


def test_matching_list_says_which_requirements_i_applied_to(world):
    _, _, requirement_id, tutor, _ = world
    before = tutor.get("/api/v1/requirements/matching/").json()["results"][0]
    assert before["application_status"] is None
    tutor.post(apply_url(requirement_id), {})
    after = tutor.get("/api/v1/requirements/matching/").json()["results"][0]
    assert after["application_status"] == "applied"


def test_guardian_sees_how_many_applied(world):
    _, guardian_client, requirement_id, tutor, _ = world
    tutor.post(apply_url(requirement_id), {})
    row = guardian_client.get("/api/v1/requirements/").json()[0]
    assert row["application_count"] == 1
