"""Admin verification: approve / reject rules, audit trail, notification, Django admin actions."""

import pytest
from django.test import Client
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.notifications.models import Notification
from apps.tutors import review
from apps.tutors.models import TutorProfile

from .test_profile_draft import SUBMIT, complete, lookups, sign_in  # noqa: F401

pytestmark = pytest.mark.django_db

PASSWORD = "Sylhet-Strong-2026!"


@pytest.fixture
def boss():
    return User.objects.create_superuser("Boss", phone="01799999999", password=PASSWORD)


@pytest.fixture
def pending():
    """A complete profile the tutor has submitted."""
    client, user = sign_in()
    complete(client)
    assert client.post(SUBMIT).status_code == 200
    return TutorProfile.objects.get(user=user)


def test_submitting_leaves_an_audit_row(pending):
    event = pending.verification_events.get()
    assert event.action == "submitted" and event.actor == pending.user


def test_approve_publishes_records_and_notifies(pending, boss):
    review.approve(pending, boss)
    pending.refresh_from_db()
    assert pending.verification_status == "approved"
    assert pending.verified_by == boss and pending.verified_at and pending.slug
    assert pending.verification_events.filter(action="approved", actor=boss).exists()
    assert Notification.objects.filter(user=pending.user, kind="profile_approved").count() == 1
    assert APIClient().get(f"/api/v1/tutors/{pending.slug}/").status_code == 200


def test_only_pending_can_be_approved(pending, boss):
    review.approve(pending, boss)
    with pytest.raises(review.ReviewError):
        review.approve(pending, boss)
    TutorProfile.objects.filter(pk=pending.pk).update(verification_status="draft")
    with pytest.raises(review.ReviewError):
        review.approve(pending, boss)


def test_reject_needs_a_reason_and_keeps_the_profile_private(pending, boss):
    with pytest.raises(review.ReviewError):
        review.reject(pending, boss, "   ")
    pending.refresh_from_db()
    assert pending.verification_status == "pending"

    review.reject(pending, boss, "Student ID is unreadable")
    pending.refresh_from_db()
    assert pending.verification_status == "rejected"
    assert pending.rejection_reason == "Student ID is unreadable"
    note = Notification.objects.get(user=pending.user, kind="profile_rejected")
    assert note.data == {"reason": "Student ID is unreadable"}
    assert pending.verification_events.filter(action="rejected", reason__contains="unreadable")


def test_a_rejected_tutor_can_fix_and_submit_again(pending, boss):
    review.reject(pending, boss, "Fix the bio")
    client = APIClient()
    client.force_authenticate(pending.user)
    assert client.post(SUBMIT).status_code == 200
    pending.refresh_from_db()
    assert pending.verification_status == "pending" and pending.rejection_reason == ""


def test_rejecting_an_approved_profile_takes_it_down(pending, boss):
    review.approve(pending, boss)
    review.reject(pending, boss, "Documents do not match")
    pending.refresh_from_db()
    assert pending.verified_at is None and pending.verified_by is None
    assert APIClient().get(f"/api/v1/tutors/{pending.slug}/").status_code == 404


# --- Django admin ------------------------------------------------------------------------------

LIST = "admin:tutors_tutorprofile_changelist"


def run_action(browser, action, pk, reason=""):
    return browser.post(
        reverse(LIST),
        {"action": action, "_selected_action": [str(pk)], "reason": reason, "index": 0},
        follow=True,
    )


def test_admin_list_hides_drafts(boss, pending):
    sign_in(phone="01788888888")[0].get("/api/v1/tutors/me/")  # creates a draft
    browser = Client()
    browser.force_login(boss)
    page = browser.get(reverse(LIST))
    assert page.context["cl"].result_count == 1


def test_admin_approve_action(boss, pending):
    browser = Client()
    browser.force_login(boss)
    run_action(browser, "approve_profiles", pending.pk)
    pending.refresh_from_db()
    assert pending.verification_status == "approved" and pending.verified_by == boss


def test_admin_reject_action_needs_a_reason(boss, pending):
    browser = Client()
    browser.force_login(boss)
    page = run_action(browser, "reject_profiles", pending.pk, reason="")
    pending.refresh_from_db()
    assert pending.verification_status == "pending"
    assert "Write the reason" in page.content.decode()

    run_action(browser, "reject_profiles", pending.pk, reason="Bio is empty")
    pending.refresh_from_db()
    assert pending.verification_status == "rejected"


def test_status_cannot_be_edited_by_hand_in_admin(boss, pending):
    browser = Client()
    browser.force_login(boss)
    page = browser.get(reverse("admin:tutors_tutorprofile_change", args=[pending.pk]))
    assert 'name="verification_status"' not in page.content.decode()


def test_a_tutor_cannot_reach_the_admin_actions(pending):
    browser = Client()
    browser.force_login(pending.user)
    run_action(browser, "approve_profiles", pending.pk)
    pending.refresh_from_db()
    assert pending.verification_status == "pending"
