"""Notifications: service (+ email after commit), list/read API and who may see what."""

from unittest import mock

import pytest
from django.core import mail
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.notifications.models import Notification
from apps.notifications.services import notify

pytestmark = pytest.mark.django_db

PASSWORD = "Sylhet-Strong-2026!"


def make_user(phone, email="", language="mixed"):
    return User.objects.create_user(
        "Test",
        phone=phone,
        email=email or None,
        password=PASSWORD,
        role="tutor",
        preferred_language=language,
    )


@pytest.fixture
def tutor():
    return make_user("01711111111", "tutor@example.com")


@pytest.fixture
def other():
    return make_user("01722222222")


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


# --- service -----------------------------------------------------------------------------------


def test_notify_stores_kind_and_data_and_emails_after_commit(
    tutor, django_capture_on_commit_callbacks
):
    with django_capture_on_commit_callbacks(execute=True):
        n = notify(tutor, Notification.Kind.PROFILE_REJECTED, reason="Student ID unreadable")
        assert mail.outbox == []  # nothing is sent before the commit
    assert n.data == {"reason": "Student ID unreadable"}
    assert len(mail.outbox) == 1
    assert mail.outbox[0].to == ["tutor@example.com"]
    assert "Student ID unreadable" in mail.outbox[0].body
    assert "/tutor/profile" in mail.outbox[0].body


@pytest.mark.parametrize(
    ("language", "needle"),
    [("en", "Good news"), ("bn", "সুখবর"), ("mixed", "profile verify")],
)
def test_email_uses_preferred_language(language, needle, django_capture_on_commit_callbacks):
    user = make_user("01733333333", "x@example.com", language)
    with django_capture_on_commit_callbacks(execute=True):
        notify(user, Notification.Kind.PROFILE_APPROVED)
    assert needle in mail.outbox[0].body


def test_no_email_without_address(other, django_capture_on_commit_callbacks):
    with django_capture_on_commit_callbacks(execute=True):
        notify(other, Notification.Kind.PROFILE_APPROVED)
    assert mail.outbox == []
    assert Notification.objects.filter(user=other).count() == 1


def test_mail_failure_does_not_break_notify(tutor, django_capture_on_commit_callbacks):
    with mock.patch("apps.notifications.emails.send_mail", side_effect=OSError("smtp down")):
        with django_capture_on_commit_callbacks(execute=True):
            notify(tutor, Notification.Kind.PROFILE_APPROVED)
    assert Notification.objects.filter(user=tutor).count() == 1


# --- API ---------------------------------------------------------------------------------------

LIST = "/api/v1/notifications/"


def test_requires_login():
    client = APIClient()
    assert client.get(LIST).status_code == 401
    assert client.get(LIST + "unread-count/").status_code == 401
    assert client.post(LIST + "read-all/").status_code == 401


def test_list_only_mine_with_unread_count(tutor, other):
    notify(tutor, Notification.Kind.PROFILE_APPROVED)
    notify(tutor, Notification.Kind.PROFILE_REJECTED, reason="x")
    notify(other, Notification.Kind.PROFILE_APPROVED)
    body = client_for(tutor).get(LIST).json()
    assert body["count"] == 2
    assert body["unread_count"] == 2
    assert {row["kind"] for row in body["results"]} == {"profile_approved", "profile_rejected"}
    assert client_for(tutor).get(LIST + "unread-count/").json() == {"unread_count": 2}


def test_mark_one_read(tutor):
    n = notify(tutor, Notification.Kind.PROFILE_APPROVED)
    res = client_for(tutor).post(f"{LIST}{n.id}/read/")
    assert res.status_code == 200
    n.refresh_from_db()
    assert n.read_at is not None
    assert client_for(tutor).get(LIST + "unread-count/").json() == {"unread_count": 0}


def test_cannot_read_someone_elses_notification(tutor, other):
    n = notify(other, Notification.Kind.PROFILE_APPROVED)
    assert client_for(tutor).post(f"{LIST}{n.id}/read/").status_code == 404
    n.refresh_from_db()
    assert n.read_at is None


def test_read_all_touches_only_mine(tutor, other):
    notify(tutor, Notification.Kind.PROFILE_APPROVED)
    notify(tutor, Notification.Kind.PROFILE_APPROVED)
    theirs = notify(other, Notification.Kind.PROFILE_APPROVED)
    res = client_for(tutor).post(LIST + "read-all/")
    assert res.json() == {"updated": 2}
    theirs.refresh_from_db()
    assert theirs.read_at is None
