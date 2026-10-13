"""Admin verification API: who may use it, queue rules, every error code, audit events."""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.notifications.models import Notification
from apps.tutors.models import TutorProfile, VerificationEvent

from .test_profile_draft import SUBMIT, complete, lookups, sign_in  # noqa: F401

pytestmark = pytest.mark.django_db

PASSWORD = "Sylhet-Strong-2026!"
LIST = "/api/v1/admin/approvals/"


def detail(profile):
    return f"{LIST}{profile.pk}/"


@pytest.fixture
def boss():
    return User.objects.create_user("Boss", phone="01799999999", password=PASSWORD, role="admin")


@pytest.fixture
def admin_client(boss):
    client = APIClient()
    client.force_authenticate(boss)
    return client


def submitted(phone):
    client, user = sign_in(phone=phone)
    complete(client)
    assert client.post(SUBMIT).status_code == 200
    return TutorProfile.objects.get(user=user)


@pytest.fixture
def pending():
    return submitted("01712345678")


# --- who may call it ---------------------------------------------------------------------------


def test_guest_gets_401(pending):
    client = APIClient()
    for call in (
        client.get(LIST),
        client.get(detail(pending)),
        client.post(detail(pending) + "approve/"),
        client.post(detail(pending) + "reject/", {"reason": "x" * 20}),
    ):
        assert call.status_code == 401


@pytest.mark.parametrize("role", ["guardian", "tutor"])
def test_other_roles_get_403(role, pending):
    client, _ = sign_in(role, phone="01788888888")
    for call in (
        client.get(LIST),
        client.get(detail(pending)),
        client.post(detail(pending) + "approve/"),
        client.post(detail(pending) + "reject/", {"reason": "x" * 20}),
    ):
        assert call.status_code == 403
        assert call.json()["code"] == "permission_denied"
    pending.refresh_from_db()
    assert pending.verification_status == "pending"


# --- queue -------------------------------------------------------------------------------------


def test_queue_lists_pending_oldest_first_with_counts(admin_client, pending):
    later = submitted("01722222222")
    TutorProfile.objects.filter(pk=pending.pk).update(
        submitted_at=timezone.now() - timedelta(days=2)
    )
    TutorProfile.objects.filter(pk=later.pk).update(submitted_at=timezone.now())
    body = admin_client.get(LIST).json()
    assert [row["id"] for row in body["results"]] == [str(pending.pk), str(later.pk)]
    assert body["counts"] == {"pending": 2, "approved": 0, "rejected": 0}
    assert body["results"][0]["has_all_documents"] is True


def test_queue_never_shows_drafts(admin_client, pending):
    client, _ = sign_in(phone="01733333333")
    client.get("/api/v1/tutors/me/")  # creates a draft
    body = admin_client.get(LIST).json()
    assert body["count"] == 1
    assert sum(body["counts"].values()) == 1


def test_queue_filters_by_status_and_rejects_unknown_status(admin_client, boss, pending):
    assert admin_client.get(LIST + "?status=approved").json()["count"] == 0
    assert admin_client.get(LIST + "?status=draft").status_code == 400
    admin_client.post(detail(pending) + "approve/")
    assert admin_client.get(LIST + "?status=approved").json()["count"] == 1
    assert admin_client.get(LIST).json()["count"] == 0


def test_queue_query_count_does_not_grow_with_rows(admin_client, django_assert_max_num_queries):
    for index in range(4):
        submitted(f"017000000{index:02d}")
    with django_assert_max_num_queries(8):
        assert admin_client.get(LIST).json()["count"] == 4


# --- detail ------------------------------------------------------------------------------------


def test_detail_has_what_an_admin_needs(admin_client, pending):
    body = admin_client.get(detail(pending)).json()
    assert body["status"] == "pending" and body["can_approve"] is True
    assert body["user"]["phone"] == "01712345678"
    assert body["missing_fields"] == []
    assert {d["kind"] for d in body["documents"]} == {"nid", "student_id"}
    assert body["documents"][0]["url"].startswith(f"/api/v1/tutors/documents/{pending.pk}/")
    assert body["history"][0]["action"] == "submitted"
    assert body["profile"]["subjects"][0]["name_bn"]


def test_a_draft_or_unknown_profile_is_404(admin_client):
    client, user = sign_in(phone="01733333333")
    client.get("/api/v1/tutors/me/")
    draft = TutorProfile.objects.get(user=user)
    assert admin_client.get(detail(draft)).status_code == 404
    assert admin_client.post(detail(draft) + "approve/").status_code == 404


# --- approve -----------------------------------------------------------------------------------


def test_approve_publishes_and_tells_the_tutor(admin_client, boss, pending):
    res = admin_client.post(detail(pending) + "approve/")
    assert res.status_code == 200 and res.json()["status"] == "approved"
    pending.refresh_from_db()
    assert pending.verified_by == boss and pending.slug
    assert Notification.objects.filter(user=pending.user, kind="profile_approved").exists()


def test_approving_twice_is_409_not_pending(admin_client, pending):
    assert admin_client.post(detail(pending) + "approve/").status_code == 200
    again = admin_client.post(detail(pending) + "approve/")
    assert again.status_code == 409 and again.json()["code"] == "not_pending"


def test_an_incomplete_profile_cannot_be_approved(admin_client, pending):
    TutorProfile.objects.filter(pk=pending.pk).update(fee_min=None)
    res = admin_client.post(detail(pending) + "approve/")
    body = res.json()
    assert res.status_code == 409 and body["code"] == "incomplete_profile"
    assert body["fields"]["fee_min"][0]["code"] == "required"
    pending.refresh_from_db()
    assert pending.verification_status == "pending"


def test_nobody_approves_their_own_profile(pending):
    User.objects.filter(pk=pending.user_id).update(is_staff=True)
    client = APIClient()
    client.force_authenticate(User.objects.get(pk=pending.user_id))
    for action, data in (("approve", None), ("reject", {"reason": "x" * 20})):
        res = client.post(detail(pending) + f"{action}/", data)
        assert res.status_code == 403 and res.json()["code"] == "self_approval"
    assert client.get(detail(pending)).json()["can_approve"] is False


# --- reject ------------------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("reason", "code"),
    [("", "required"), ("   ", "required"), ("too short", "too_short"), ("x" * 501, "too_long")],
)
def test_reject_needs_a_usable_reason(admin_client, pending, reason, code):
    res = admin_client.post(detail(pending) + "reject/", {"reason": reason})
    assert res.status_code == 400
    assert res.json()["fields"]["reason"][0]["code"] == code
    pending.refresh_from_db()
    assert pending.verification_status == "pending"


def test_reject_without_a_reason_field_is_400(admin_client, pending):
    assert admin_client.post(detail(pending) + "reject/", {}).status_code == 400


def test_reject_records_reason_and_tells_the_tutor(admin_client, pending):
    reason = "Student ID photo is unreadable, please upload again."
    res = admin_client.post(detail(pending) + "reject/", {"reason": f"  {reason}  "})
    assert res.status_code == 200
    pending.refresh_from_db()
    assert pending.verification_status == "rejected" and pending.rejection_reason == reason
    note = Notification.objects.get(user=pending.user, kind="profile_rejected")
    assert note.data == {"reason": reason}
    body = admin_client.get(detail(pending)).json()
    assert [h["action"] for h in body["history"]] == ["rejected", "submitted"]
    assert body["history"][0]["reason"] == reason


def test_rejecting_a_draft_state_profile_is_not_possible(admin_client, pending):
    admin_client.post(detail(pending) + "reject/", {"reason": "x" * 20})
    again = admin_client.post(detail(pending) + "reject/", {"reason": "y" * 20})
    assert again.status_code == 409 and again.json()["code"] == "not_pending"


# --- audit of document reads ---------------------------------------------------------------------


def document_url(profile, kind="nid"):
    return f"/api/v1/tutors/documents/{profile.pk}/{kind}/"


def test_an_admin_reading_a_document_leaves_a_trace(admin_client, boss, pending):
    assert admin_client.get(document_url(pending)).status_code == 200
    event = VerificationEvent.objects.get(action="document_viewed")
    assert event.actor == boss and event.meta == {"kind": "nid"} and event.profile == pending
    # the queue page's history does not list reads
    assert all(
        h["action"] != "document_viewed"
        for h in admin_client.get(detail(pending)).json()["history"]
    )


def test_the_owner_reading_their_own_scan_is_not_logged(pending):
    client = APIClient()
    client.force_authenticate(pending.user)
    assert client.get(document_url(pending)).status_code == 200
    assert not VerificationEvent.objects.filter(action="document_viewed").exists()


def test_a_failed_read_is_not_logged(admin_client, pending):
    assert admin_client.get(document_url(pending, "passport")).status_code == 404
    assert not VerificationEvent.objects.filter(action="document_viewed").exists()
