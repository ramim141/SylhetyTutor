"""Guardian confirmation: the daily command, the signed link, and the admin call list."""

from datetime import timedelta
from io import StringIO

import pytest
from django.core import mail, signing
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APIClient

from apps.matching import confirmation
from apps.matching.models import Match
from apps.matching.signals import match_confirmed
from apps.notifications.models import Notification

from .helpers import approved_tutor, client_for, make_lookups, make_user, open_requirement

pytestmark = pytest.mark.django_db

GUARDIAN_PHONE = "01711111111"
TUTOR_PHONE = "01722222222"


@pytest.fixture
def world():
    """A booked demo (fee off, so contact is open) two days from now."""
    make_lookups()
    guardian = make_user("guardian", GUARDIAN_PHONE, name="Karim Guardian", email="g@example.com")
    guardian_client = client_for(guardian)
    requirement_id = open_requirement(guardian_client)
    tutor, profile = approved_tutor(phone=TUTOR_PHONE, name="Rahim Uddin")
    application_id = tutor.post(f"/api/v1/tutors/me/apply/{requirement_id}/", {}).json()["id"]
    guardian_client.post(f"/api/v1/applications/{application_id}/shortlist/")
    when = (timezone.now() + timedelta(days=2)).isoformat()
    guardian_client.post(f"/api/v1/applications/{application_id}/book-demo/", {"demo_at": when})
    return guardian, Match.objects.get()


def run(*args):
    out = StringIO()
    call_command("send_confirmations", *args, stdout=out)
    return out.getvalue()


def token_of(guardian):
    note = Notification.objects.get(user=guardian, kind="confirm_tuition")
    return note.data["path"].rsplit("/", 1)[1]


def test_nothing_is_asked_before_enough_days_have_passed(world):
    assert "0 confirmation" in run()
    assert "0 confirmation" in run("--days-ahead", "8")  # demo is 2 days away: 8 days is too early
    assert not Notification.objects.filter(kind="confirm_tuition").exists()


def test_the_command_asks_once_after_the_delay(world, django_capture_on_commit_callbacks):
    guardian, match = world
    mail.outbox.clear()
    assert "1 confirmation(s) would be sent" in run("--days-ahead", "10", "--dry-run")
    assert Match.objects.get().confirmation_requested_at is None

    with django_capture_on_commit_callbacks(execute=True):
        assert "1 confirmation" in run("--days-ahead", "10")
    assert "0 confirmation" in run("--days-ahead", "10")  # never twice
    assert Notification.objects.filter(kind="confirm_tuition").count() == 1
    assert len(mail.outbox) == 1
    body = mail.outbox[0].body
    assert "/confirm/" in body and GUARDIAN_PHONE not in body and TUTOR_PHONE not in body


def test_a_demo_whose_contact_never_opened_is_not_asked_about(world, settings):
    _, match = world
    match.unlock.delete()
    assert "0 confirmation" in run("--days-ahead", "10")


def test_the_link_shows_only_the_tutor_name_and_time(world):
    guardian, match = world
    run("--days-ahead", "10")
    response = APIClient().get(f"/api/v1/confirmations/{token_of(guardian)}/")
    assert response.status_code == 200
    body = response.json()
    assert body["tutor_name"] == "Rahim Uddin" and body["answered"] is False
    assert set(body) == {"tutor_name", "demo_at", "answered", "started"}
    assert TUTOR_PHONE not in response.content.decode()


def test_yes_confirms_once_and_tells_the_commission_listener(world):
    guardian, match = world
    run("--days-ahead", "10")
    heard = []
    receiver = lambda sender, match, **kw: heard.append(match.pk)  # noqa: E731
    match_confirmed.connect(receiver)
    try:
        url = f"/api/v1/confirmations/{token_of(guardian)}/"
        response = APIClient().post(url, {"answer": "yes"})
    finally:
        match_confirmed.disconnect(receiver)
    assert response.status_code == 200 and response.json()["started"] is True
    match.refresh_from_db()
    assert match.status == "confirmed" and match.confirmation_channel == "link"
    assert match.guardian_confirmed_at is not None and heard == [match.pk]
    again = APIClient().post(url, {"answer": "no"})
    assert again.status_code == 409 and again.json()["code"] == "already_answered"
    assert Match.objects.get().status == "confirmed"


def test_no_declines_and_does_not_start_a_commission(world):
    guardian, match = world
    run("--days-ahead", "10")
    heard = []
    receiver = lambda sender, match, **kw: heard.append(match.pk)  # noqa: E731
    match_confirmed.connect(receiver)
    try:
        response = APIClient().post(
            f"/api/v1/confirmations/{token_of(guardian)}/", {"answer": "no"}
        )
    finally:
        match_confirmed.disconnect(receiver)
    assert response.json()["started"] is False and heard == []
    match.refresh_from_db()
    assert match.status == "declined" and match.guardian_confirmed_at is None


def test_bad_tampered_and_expired_links_are_404(world, settings):
    guardian, match = world
    run("--days-ahead", "10")
    token = token_of(guardian)
    client = APIClient()
    for bad in ("nonsense", token[:-3] + "xyz", signing.dumps("not-a-uuid", salt="other")):
        response = client.get(f"/api/v1/confirmations/{bad}/")
        assert response.status_code == 404 and response.json()["code"] == "invalid_link"
    settings.CONFIRMATION_LINK_MAX_AGE_DAYS = -1
    assert client.post(f"/api/v1/confirmations/{token}/", {"answer": "yes"}).status_code == 404
    assert Match.objects.get().status == "trial_scheduled"


def test_a_bad_answer_is_refused(world):
    guardian, _ = world
    run("--days-ahead", "10")
    response = APIClient().post(f"/api/v1/confirmations/{token_of(guardian)}/", {"answer": "maybe"})
    assert response.status_code == 400


# --- admin call list ------------------------------------------------------------------------


@pytest.fixture
def admin():
    return client_for(make_user("admin", "01799999999", name="Admin"))


def test_call_list_fills_up_only_after_the_waiting_period(world, admin):
    guardian, match = world
    assert admin.get("/api/v1/admin/call-list/").json() == []
    run("--days-ahead", "10")
    assert admin.get("/api/v1/admin/call-list/").json() == []  # just asked
    Match.objects.update(confirmation_requested_at=timezone.now() - timedelta(days=4))
    rows = admin.get("/api/v1/admin/call-list/").json()
    assert len(rows) == 1
    assert rows[0]["guardian_phone"] == GUARDIAN_PHONE
    assert rows[0]["whatsapp_url"] == f"https://wa.me/88{GUARDIAN_PHONE}"
    assert rows[0]["tutor_name"] == "Rahim Uddin"


def test_an_admin_records_the_phone_answer(world, admin):
    guardian, match = world
    run("--days-ahead", "10")
    Match.objects.update(confirmation_requested_at=timezone.now() - timedelta(days=4))
    response = admin.post(
        f"/api/v1/admin/call-list/{match.pk}/answer/", {"answer": "yes", "channel": "whatsapp"}
    )
    assert response.status_code == 200
    match.refresh_from_db()
    assert match.status == "confirmed" and match.confirmation_channel == "whatsapp"
    assert admin.get("/api/v1/admin/call-list/").json() == []
    # not on the list any more (already answered)
    assert (
        admin.post(f"/api/v1/admin/call-list/{match.pk}/answer/", {"answer": "no"}).status_code
        == 404
    )


def test_call_list_is_admin_only(world):
    guardian, match = world
    tutor = client_for(match.tutor.user)
    for client, code in ((APIClient(), 401), (tutor, 403), (client_for(guardian), 403)):
        assert client.get("/api/v1/admin/call-list/").status_code == code
        assert (
            client.post(
                f"/api/v1/admin/call-list/{match.pk}/answer/", {"answer": "yes"}
            ).status_code
            == code
        )


def test_make_token_round_trips(world):
    _, match = world
    assert confirmation.match_from_token(confirmation.make_token(match)).pk == match.pk
