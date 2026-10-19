from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.matching.models import Match
from apps.matching.tests.helpers import (
    approved_tutor,
    client_for,
    make_lookups,
    make_user,
    open_requirement,
)
from apps.notifications.models import Notification

pytestmark = pytest.mark.django_db


@pytest.fixture
def review_setup():
    make_lookups()
    guardian = make_user("guardian", "01711111111", name="Karim Guardian")
    guardian_client = client_for(guardian)
    requirement_id = open_requirement(guardian_client)

    tutor_client, tutor_profile = approved_tutor(phone="01722222222", name="Rahim Uddin")
    app_res = tutor_client.post(f"/api/v1/tutors/me/apply/{requirement_id}/", {}).json()
    application_id = app_res["id"]

    guardian_client.post(f"/api/v1/applications/{application_id}/shortlist/")
    when = (timezone.now() + timedelta(days=2)).isoformat()
    guardian_client.post(f"/api/v1/applications/{application_id}/book-demo/", {"demo_at": when})

    match = Match.objects.get()
    return {
        "guardian_user": guardian,
        "guardian": guardian_client,
        "tutor_client": tutor_client,
        "tutor_profile": tutor_profile,
        "match": match,
    }


def test_cannot_review_without_confirmed_match(review_setup):
    guardian = review_setup["guardian"]
    tutor_profile = review_setup["tutor_profile"]

    # Match status is TRIAL_SCHEDULED, not CONFIRMED
    res = guardian.post(
        f"/api/v1/tutors/{tutor_profile.slug}/reviews/create/",
        {"rating": 5, "comment": "Great tutor!"},
    )
    assert res.status_code == 409
    assert res.json()["code"] == "no_confirmed_match"


def test_can_review_with_confirmed_match_and_updates_rating(review_setup):
    guardian = review_setup["guardian"]
    tutor_profile = review_setup["tutor_profile"]
    match = review_setup["match"]

    match.status = Match.Status.CONFIRMED
    match.guardian_confirmed_at = timezone.now()
    match.save()

    res = guardian.post(
        f"/api/v1/tutors/{tutor_profile.slug}/reviews/create/",
        {"rating": 5, "comment": "Amazing teaching skills!"},
    )
    assert res.status_code == 201
    assert res.json()["rating"] == 5

    tutor_profile.refresh_from_db()
    assert tutor_profile.rating_avg == 5.0
    assert tutor_profile.review_count == 1

    # Check notification sent to tutor
    notif = Notification.objects.filter(
        user=tutor_profile.user, kind=Notification.Kind.REVIEW_RECEIVED
    ).first()
    assert notif is not None
    assert notif.data["rating"] == 5

    # Check cannot review twice
    again = guardian.post(
        f"/api/v1/tutors/{tutor_profile.slug}/reviews/create/",
        {"rating": 4, "comment": "Another review"},
    )
    assert again.status_code == 409
    assert again.json()["code"] == "already_reviewed"


def test_public_reviews_list(review_setup):
    guardian = review_setup["guardian"]
    tutor_profile = review_setup["tutor_profile"]
    match = review_setup["match"]

    match.status = Match.Status.CONFIRMED
    match.save()

    guardian.post(
        f"/api/v1/tutors/{tutor_profile.slug}/reviews/create/",
        {"rating": 4, "comment": "Very polite and helpful."},
    )

    anon = APIClient()
    list_res = anon.get(f"/api/v1/tutors/{tutor_profile.slug}/reviews/")
    assert list_res.status_code == 200
    results = list_res.json()["results"]
    assert len(results) == 1
    assert results[0]["rating"] == 4
    assert results[0]["comment"] == "Very polite and helpful."


def test_guardian_review_status_endpoint(review_setup):
    guardian = review_setup["guardian"]
    tutor_profile = review_setup["tutor_profile"]
    match = review_setup["match"]

    # Before confirmation
    status_res = guardian.get(f"/api/v1/guardians/me/reviews/{tutor_profile.slug}/")
    assert status_res.status_code == 200
    assert status_res.json()["can_review"] is False
    assert status_res.json()["has_reviewed"] is False

    # Confirm match
    match.status = Match.Status.CONFIRMED
    match.save()

    status_res = guardian.get(f"/api/v1/guardians/me/reviews/{tutor_profile.slug}/")
    assert status_res.status_code == 200
    assert status_res.json()["can_review"] is True
    assert status_res.json()["has_reviewed"] is False

    # Submit review
    guardian.post(
        f"/api/v1/tutors/{tutor_profile.slug}/reviews/create/",
        {"rating": 5, "comment": "Top class."},
    )

    status_res = guardian.get(f"/api/v1/guardians/me/reviews/{tutor_profile.slug}/")
    assert status_res.status_code == 200
    assert status_res.json()["can_review"] is False
    assert status_res.json()["has_reviewed"] is True
    assert status_res.json()["review"]["rating"] == 5


def test_tutor_cannot_submit_review(review_setup):
    tutor_client = review_setup["tutor_client"]
    tutor_profile = review_setup["tutor_profile"]

    res = tutor_client.post(
        f"/api/v1/tutors/{tutor_profile.slug}/reviews/create/",
        {"rating": 5, "comment": "I review myself"},
    )
    assert res.status_code == 403
    assert res.json()["code"] == "only_guardian"
