"""POST /auth/password/change/ — signed-in password change (Sprint 1 extra)."""

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts.models import User

pytestmark = pytest.mark.django_db

URL = "/api/v1/auth/password/change/"
LOGIN = "/api/v1/auth/login/"
OLD = "Sylhet-Strong-2026!"
NEW = "Surma-River-Fresh-9"


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    cache.clear()


@pytest.fixture
def user():
    return User.objects.create_user("Rahim Uddin", phone="01712345678", password=OLD)


def login(identifier="01712345678", password=OLD):
    client = APIClient()
    response = client.post(LOGIN, {"identifier": identifier, "password": password})
    assert response.status_code == 200
    return client, response.json()


def authed(client, access):
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    return client


def test_requires_authentication():
    response = APIClient().post(URL, {"old_password": OLD, "new_password": NEW})
    assert response.status_code == 401


def test_changes_password_and_old_one_stops_working(user):
    client, tokens = login()
    response = authed(client, tokens["access"]).post(
        URL, {"old_password": OLD, "new_password": NEW}
    )

    assert response.status_code == 200
    user.refresh_from_db()
    assert user.check_password(NEW)
    assert (
        APIClient().post(LOGIN, {"identifier": "01712345678", "password": OLD}).status_code == 401
    )
    assert (
        APIClient().post(LOGIN, {"identifier": "01712345678", "password": NEW}).status_code == 200
    )


def test_returns_fresh_tokens_and_signs_out_other_devices(user):
    phone, phone_tokens = login()
    laptop, laptop_tokens = login()

    response = authed(phone, phone_tokens["access"]).post(
        URL, {"old_password": OLD, "new_password": NEW}
    )
    fresh = response.json()
    assert set(fresh) == {"access", "refresh"}

    refresh = "/api/v1/auth/token/refresh/"
    assert laptop.post(refresh, {"refresh": laptop_tokens["refresh"]}).status_code == 401
    assert phone.post(refresh, {"refresh": phone_tokens["refresh"]}).status_code == 401
    assert APIClient().post(refresh, {"refresh": fresh["refresh"]}).status_code == 200


def test_wrong_current_password_is_rejected_with_code(user):
    client, tokens = login()
    response = authed(client, tokens["access"]).post(
        URL, {"old_password": "not-my-password", "new_password": NEW}
    )

    assert response.status_code == 400
    error = response.json()["fields"]["old_password"][0]
    assert error["code"] == "wrong_password"
    user.refresh_from_db()
    assert user.check_password(OLD)


@pytest.mark.parametrize(
    ("new_password", "code"),
    [
        ("short1A", "password_too_short"),
        ("12345678901", "password_entirely_numeric"),
        ("password123", "password_too_common"),
        ("01712345678a", "password_too_similar"),
    ],
)
def test_weak_new_password_is_rejected(user, new_password, code):
    client, tokens = login()
    response = authed(client, tokens["access"]).post(
        URL, {"old_password": OLD, "new_password": new_password}
    )

    assert response.status_code == 400
    codes = [e["code"] for e in response.json()["fields"]["new_password"]]
    assert code in codes


def test_new_password_must_differ_from_current(user):
    client, tokens = login()
    response = authed(client, tokens["access"]).post(
        URL, {"old_password": OLD, "new_password": OLD}
    )

    assert response.status_code == 400
    assert response.json()["fields"]["new_password"][0]["code"] == "same_password"


def test_missing_fields_are_reported_per_field(user):
    client, tokens = login()
    response = authed(client, tokens["access"]).post(URL, {})

    assert response.status_code == 400
    assert set(response.json()["fields"]) == {"old_password", "new_password"}


def test_sixth_wrong_attempt_in_a_minute_is_throttled(user):
    client, tokens = login()
    authed(client, tokens["access"])
    for _ in range(5):
        assert client.post(URL, {"old_password": "x", "new_password": NEW}).status_code == 400

    response = client.post(URL, {"old_password": "x", "new_password": NEW})
    assert response.status_code == 429
    assert response.json()["code"] == "throttled"
