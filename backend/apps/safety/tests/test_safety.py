from datetime import timedelta

import pytest
from django.utils import timezone

from apps.matching.models import Match
from apps.matching.tests.helpers import (
    approved_tutor,
    client_for,
    make_lookups,
    make_user,
    open_requirement,
)
from apps.notifications.models import Notification
from apps.safety.models import Report

pytestmark = pytest.mark.django_db


@pytest.fixture
def safety_setup():
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

    admin = client_for(make_user("admin", "01799999999", name="Admin User"))
    match = Match.objects.get()

    return {
        "guardian_user": guardian,
        "guardian": guardian_client,
        "tutor_client": tutor_client,
        "tutor_profile": tutor_profile,
        "admin": admin,
        "match": match,
    }


def test_submit_report_against_tutor(safety_setup):
    guardian = safety_setup["guardian"]
    tutor_profile = safety_setup["tutor_profile"]

    res = guardian.post(
        "/api/v1/reports/",
        {
            "target_slug": tutor_profile.slug,
            "category": "inappropriate_behavior",
            "reason": "The tutor arrived 2 hours late and was rude.",
        },
    )
    assert res.status_code == 201
    assert Report.objects.filter(category="inappropriate_behavior").exists()


def test_admin_cannot_submit_report(safety_setup):
    admin = safety_setup["admin"]
    tutor_profile = safety_setup["tutor_profile"]

    res = admin.post(
        "/api/v1/reports/",
        {
            "target_slug": tutor_profile.slug,
            "category": "other",
            "reason": "Admin trying to report directly.",
        },
    )
    assert res.status_code == 403


def test_tutor_can_submit_report(safety_setup):
    tutor_client = safety_setup["tutor_client"]
    guardian_user = safety_setup["guardian_user"]

    res = tutor_client.post(
        "/api/v1/reports/",
        {
            "target_user_id": str(guardian_user.id),
            "category": "inappropriate_behavior",
            "reason": "Guardian was disrespectful during demo class.",
        },
    )
    assert res.status_code == 201


def test_cannot_report_self(safety_setup):
    guardian = safety_setup["guardian"]
    guardian_user = safety_setup["guardian_user"]

    res = guardian.post(
        "/api/v1/reports/",
        {
            "target_user_id": str(guardian_user.id),
            "category": "other",
            "reason": "Trying to report myself.",
        },
    )
    assert res.status_code == 400
    assert res.json()["code"] == "self_report"


def test_admin_reports_queue_and_resolve(safety_setup):
    guardian = safety_setup["guardian"]
    tutor_profile = safety_setup["tutor_profile"]
    admin = safety_setup["admin"]

    rep_res = guardian.post(
        "/api/v1/reports/",
        {
            "target_slug": tutor_profile.slug,
            "category": "unresponsive",
            "reason": "Tutor did not show up for scheduled classes.",
        },
    ).json()

    # Admin list
    list_res = admin.get("/api/v1/admin/reports/")
    assert list_res.status_code == 200
    assert list_res.json()["counts"]["pending"] >= 1

    report_id = rep_res["id"]
    resolve_res = admin.post(
        f"/api/v1/admin/reports/{report_id}/resolve/",
        {"action": "warned", "admin_notes": "Issued official warning."},
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "resolved"
    assert resolve_res.json()["action_taken"] == "warned"


def test_admin_one_click_suspend_tutor(safety_setup):
    guardian = safety_setup["guardian"]
    tutor_profile = safety_setup["tutor_profile"]
    admin = safety_setup["admin"]

    rep_res = guardian.post(
        "/api/v1/reports/",
        {
            "target_slug": tutor_profile.slug,
            "category": "harassment",
            "reason": "Severe misconduct and abusive messaging.",
        },
    ).json()

    report_id = rep_res["id"]
    suspend_res = admin.post(
        f"/api/v1/admin/reports/{report_id}/suspend-tutor/",
        {"reason": "Suspended due to safety policy violation."},
    )
    assert suspend_res.status_code == 200

    tutor_profile.refresh_from_db()
    assert tutor_profile.suspended_at is not None

    notif = Notification.objects.filter(
        user=tutor_profile.user, kind=Notification.Kind.ACCOUNT_SUSPENDED
    ).first()
    assert notif is not None
    assert "safety policy violation" in notif.data["reason"]


def test_guardian_replacement_request(safety_setup):
    guardian = safety_setup["guardian"]
    match = safety_setup["match"]
    admin = safety_setup["admin"]

    res = guardian.post(
        f"/api/v1/matches/{match.id}/replace/",
        {"reason": "The tutor's communication style does not fit our child."},
    )
    assert res.status_code == 201

    # Check cannot request again while pending
    again = guardian.post(
        f"/api/v1/matches/{match.id}/replace/",
        {"reason": "Another request."},
    )
    assert again.status_code == 409
    assert again.json()["code"] == "already_requested"

    # Admin lists replacements
    admin_list = admin.get("/api/v1/admin/replacements/")
    assert admin_list.status_code == 200
    assert len(admin_list.json()["results"]) >= 1

    repl_id = res.json()["id"]
    resolve_res = admin.post(
        f"/api/v1/admin/replacements/{repl_id}/resolve/",
        {"status": "processed", "admin_notes": "Assigned new tutor manually."},
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "processed"
