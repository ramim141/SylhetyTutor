"""The guardian's side: who applied, shortlist, reject, and who may touch what."""

from unittest import mock

import pytest
from django.contrib import admin
from rest_framework.test import APIClient

from apps.matching.admin import TutorApplicationAdmin
from apps.matching.models import TutorApplication
from apps.notifications.models import Notification

from .helpers import approved_tutor, client_for, make_lookups, make_user, open_requirement

pytestmark = pytest.mark.django_db


def apply_url(requirement_id):
    return f"/api/v1/tutors/me/apply/{requirement_id}/"


def applicants_url(requirement_id):
    return f"/api/v1/requirements/{requirement_id}/applications/"


@pytest.fixture
def world():
    make_lookups()
    guardian = make_user("guardian", "01711111111", name="Karim Guardian")
    guardian_client = client_for(guardian)
    requirement_id = open_requirement(guardian_client)
    tutor_client, profile = approved_tutor()
    application_id = tutor_client.post(apply_url(requirement_id), {"message": "hi"}).json()["id"]
    return guardian_client, requirement_id, tutor_client, profile, application_id


def test_the_guardian_sees_applicants_as_public_cards(world):
    guardian, requirement_id, _, profile, application_id = world
    rows = guardian.get(applicants_url(requirement_id)).json()
    assert len(rows) == 1
    row = rows[0]
    assert row["id"] == application_id and row["message"] == "hi"
    assert row["tutor"]["name"] == "Rahim Uddin" and row["tutor"]["slug"] == profile.slug
    text = str(rows)
    assert "01722222222" not in text and "phone" not in text and "email" not in text


def test_opening_the_list_marks_new_applications_viewed(world):
    guardian, requirement_id, tutor, _, _ = world
    assert tutor.get("/api/v1/tutors/me/applications/").json()[0]["status"] == "applied"
    assert guardian.get(applicants_url(requirement_id)).json()[0]["status"] == "viewed"
    assert tutor.get("/api/v1/tutors/me/applications/").json()[0]["status"] == "viewed"


def test_shortlist_then_the_tutor_is_told(world):
    guardian, _, tutor, profile, application_id = world
    response = guardian.post(f"/api/v1/applications/{application_id}/shortlist/")
    assert response.status_code == 200 and response.json()["status"] == "shortlisted"
    assert tutor.get("/api/v1/tutors/me/applications/").json()[0]["status"] == "shortlisted"
    note = Notification.objects.get(user=profile.user, kind="application_shortlisted")
    assert "requirement_id" in note.data
    again = guardian.post(f"/api/v1/applications/{application_id}/shortlist/")
    assert again.status_code == 409 and again.json()["code"] == "already_shortlisted"


def test_reject_then_the_tutor_is_told_and_can_be_shortlisted_after_all(world):
    guardian, _, _, profile, application_id = world
    assert guardian.post(f"/api/v1/applications/{application_id}/reject/").json()["status"] == (
        "rejected"
    )
    assert Notification.objects.filter(user=profile.user, kind="application_rejected").exists()
    again = guardian.post(f"/api/v1/applications/{application_id}/reject/")
    assert again.status_code == 409 and again.json()["code"] == "already_rejected"
    changed = guardian.post(f"/api/v1/applications/{application_id}/shortlist/")
    assert changed.status_code == 200 and changed.json()["status"] == "shortlisted"


def test_no_decisions_once_the_requirement_is_closed(world):
    guardian, requirement_id, *_, application_id = world
    guardian.post(f"/api/v1/requirements/{requirement_id}/close/", {})
    response = guardian.post(f"/api/v1/applications/{application_id}/shortlist/")
    assert response.status_code == 409 and response.json()["code"] == "requirement_not_open"


def test_another_guardian_gets_404_and_nothing_changes(world):
    _, requirement_id, _, _, application_id = world
    intruder = client_for(make_user("guardian", "01788888888"))
    assert intruder.get(applicants_url(requirement_id)).status_code == 404
    assert intruder.post(f"/api/v1/applications/{application_id}/shortlist/").status_code == 404
    assert intruder.post(f"/api/v1/applications/{application_id}/reject/").status_code == 404
    assert TutorApplication.objects.get().status == "applied"


def test_only_guardians_decide(world):
    _, requirement_id, tutor, _, application_id = world
    for client in (APIClient(), tutor, client_for(make_user("admin", "01799999999"))):
        expected = 401 if client.handler._force_user is None else 403
        assert client.get(applicants_url(requirement_id)).status_code == expected
        assert client.post(f"/api/v1/applications/{application_id}/shortlist/").status_code == (
            expected
        )


def test_admin_actions_use_the_same_rules(world):
    *_, application_id = world
    model_admin = TutorApplicationAdmin(TutorApplication, admin.site)
    model_admin.message_user = mock.Mock()
    queryset = TutorApplication.objects.filter(pk=application_id)
    model_admin.shortlist(mock.Mock(), queryset)
    assert TutorApplication.objects.get().status == "shortlisted"
    model_admin.reject(mock.Mock(), queryset)
    assert TutorApplication.objects.get().status == "rejected"
    assert Notification.objects.filter(kind="application_rejected").exists()
