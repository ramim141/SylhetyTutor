"""
Auth hardening: throttles that survive shared mobile IPs, honest error codes,
and logout that can't revoke someone else's session.
"""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User

pytestmark = pytest.mark.django_db

LOGIN = "/api/v1/auth/login/"
PASSWORD = "Sylhet-Strong-2026!"


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def rahim():
    return User.objects.create_user("Rahim", phone="01712345678", password=PASSWORD)


def test_sixth_wrong_password_for_one_account_is_throttled_with_retry_after(client, rahim):
    for _ in range(5):
        assert client.post(LOGIN, {"identifier": "01712345678", "password": "x"}).status_code == 401

    # Same account in another format still counts against the same limit
    response = client.post(LOGIN, {"identifier": "+880 1712-345678", "password": PASSWORD})

    assert response.status_code == 429
    assert response.json()["code"] == "throttled"
    assert response.json()["retry_after"] > 0


def test_other_users_on_the_same_ip_are_not_locked_out(client, rahim):
    """CGNAT: one attacker hammering an account must not block everyone behind that IP."""
    User.objects.create_user("Karim", phone="01812345678", password=PASSWORD)
    for _ in range(5):
        client.post(LOGIN, {"identifier": "01712345678", "password": "x"})

    response = client.post(LOGIN, {"identifier": "01812345678", "password": PASSWORD})

    assert response.status_code == 200


def test_browsing_public_endpoints_has_no_daily_anonymous_cap(client):
    for _ in range(250):
        response = client.get("/api/v1/lookups/")
    assert response.status_code == 200


def test_invalid_access_token_reports_token_code_not_wrong_password(client):
    client.credentials(HTTP_AUTHORIZATION="Bearer not-a-real-token")

    response = client.get("/api/v1/auth/me/")

    assert response.status_code == 401
    assert response.json()["code"] == "token_not_valid"


def test_missing_token_reports_not_authenticated(client):
    response = client.get("/api/v1/auth/me/")

    assert response.status_code == 401
    assert response.json()["code"] == "not_authenticated"


def test_logout_cannot_revoke_another_users_refresh_token(client, rahim):
    karim = User.objects.create_user("Karim", phone="01812345678", password=PASSWORD)
    rahim_tokens = client.post(LOGIN, {"identifier": "01712345678", "password": PASSWORD}).json()
    karim_tokens = client.post(LOGIN, {"identifier": "01812345678", "password": PASSWORD}).json()

    client.credentials(HTTP_AUTHORIZATION=f"Bearer {karim_tokens['access']}")
    assert (
        client.post("/api/v1/auth/logout/", {"refresh": rahim_tokens["refresh"]}).status_code == 204
    )

    client.credentials()
    refreshed = client.post("/api/v1/auth/token/refresh/", {"refresh": rahim_tokens["refresh"]})
    assert refreshed.status_code == 200, "Rahim's session must survive Karim's logout call"
    assert karim.pk != rahim.pk
