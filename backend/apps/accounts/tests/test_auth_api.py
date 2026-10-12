import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.lookups.models import Area

User = get_user_model()
pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    return APIClient()


def test_register_guardian_with_phone_success(client):
    payload = {
        "full_name": "Rahim Uddin",
        "phone": "+880 1712-345678",
        "password": "StrongPassword123!",
        "role": "guardian",
        "preferred_language": "bn",
    }
    response = client.post("/api/v1/auth/register/", payload)
    assert response.status_code == 201
    data = response.json()

    assert "user" in data
    assert "access" in data
    assert "refresh" in data
    assert data["user"]["full_name"] == "Rahim Uddin"
    assert data["user"]["phone"] == "01712345678"
    assert data["user"]["role"] == "guardian"
    assert data["user"]["preferred_language"] == "bn"

    # Password should be properly hashed
    user = User.objects.get(phone="01712345678")
    assert user.check_password("StrongPassword123!")


def test_register_with_email_only_success(client):
    payload = {
        "full_name": "Karim Mia",
        "email": "Karim@Example.Com",
        "password": "StrongPassword123!",
        "role": "tutor",
    }
    response = client.post("/api/v1/auth/register/", payload)
    assert response.status_code == 201
    data = response.json()
    assert data["user"]["email"] == "karim@example.com"
    assert data["user"]["role"] == "tutor"


def test_register_missing_both_phone_and_email(client):
    payload = {
        "full_name": "Nobody",
        "password": "StrongPassword123!",
        "role": "guardian",
    }
    response = client.post("/api/v1/auth/register/", payload)
    assert response.status_code == 400
    data = response.json()
    assert "fields" in data
    assert "phone" in data["fields"]


def test_register_duplicate_phone_normalized(client):
    User.objects.create_user(
        full_name="Existing User",
        phone="01712345678",
        password="Password123!",
    )
    payload = {
        "full_name": "Second User",
        "phone": "+8801712345678",  # duplicate when normalized
        "password": "Password123!",
    }
    response = client.post("/api/v1/auth/register/", payload)
    assert response.status_code == 400
    data = response.json()
    assert data["fields"]["phone"][0]["code"] == "unique"


def test_register_cannot_claim_admin_role(client):
    payload = {
        "full_name": "Hacker",
        "phone": "01799887766",
        "password": "StrongPassword123!",
        "role": "admin",
    }
    response = client.post("/api/v1/auth/register/", payload)
    assert response.status_code == 400


def test_register_weak_password_rejected(client):
    payload = {
        "full_name": "Test User",
        "phone": "01788776655",
        "password": "123",
    }
    response = client.post("/api/v1/auth/register/", payload)
    assert response.status_code == 400
    data = response.json()
    assert "password" in data["fields"]


def test_login_with_phone_and_with_email(client):
    User.objects.create_user(
        full_name="Dual User",
        phone="01711223344",
        email="dual@example.com",
        password="MySecretPassword123!",
        role="guardian",
    )

    # 1. Login with Phone (including spaces/hyphens)
    res_phone = client.post(
        "/api/v1/auth/login/",
        {"identifier": "+88 01711-223344", "password": "MySecretPassword123!"},
    )
    assert res_phone.status_code == 200
    assert res_phone.json()["user"]["full_name"] == "Dual User"

    # 2. Login with uppercase Email
    res_email = client.post(
        "/api/v1/auth/login/",
        {"identifier": "DUAL@EXAMPLE.COM", "password": "MySecretPassword123!"},
    )
    assert res_email.status_code == 200
    assert res_email.json()["user"]["full_name"] == "Dual User"


def test_login_invalid_credentials_uniform_error(client):
    User.objects.create_user(
        full_name="Target",
        phone="01711112222",
        password="CorrectPassword123!",
    )

    # Wrong password for existing user
    res1 = client.post(
        "/api/v1/auth/login/",
        {"identifier": "01711112222", "password": "WrongPassword!"},
    )
    assert res1.status_code == 401
    assert res1.json()["code"] == "invalid_credentials"

    # Unknown user
    res2 = client.post(
        "/api/v1/auth/login/",
        {"identifier": "01799999999", "password": "AnyPassword!"},
    )
    assert res2.status_code == 401
    assert res2.json()["code"] == "invalid_credentials"
    assert res1.json()["detail"] == res2.json()["detail"]


def test_token_refresh_and_logout_blacklist(client):
    reg = client.post(
        "/api/v1/auth/register/",
        {
            "full_name": "Token Tester",
            "phone": "01755667788",
            "password": "Password123!",
        },
    )
    refresh_token = reg.json()["refresh"]

    # 1. Refresh token yields new access
    res_ref = client.post("/api/v1/auth/token/refresh/", {"refresh": refresh_token})
    assert res_ref.status_code == 200
    new_access = res_ref.json()["access"]
    assert new_access

    # 2. Logout blacklists token
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {new_access}")
    res_logout = client.post("/api/v1/auth/logout/", {"refresh": refresh_token})
    assert res_logout.status_code == 204

    # 3. Old refresh token cannot be used again
    res_ref_fail = client.post("/api/v1/auth/token/refresh/", {"refresh": refresh_token})
    assert res_ref_fail.status_code == 401


def test_me_endpoint_get_and_patch(client):
    reg = client.post(
        "/api/v1/auth/register/",
        {
            "full_name": "Me User",
            "phone": "01733445566",
            "password": "Password123!",
            "role": "guardian",
        },
    )
    access = reg.json()["access"]

    # 1. Without auth fails
    res_unauth = client.get("/api/v1/auth/me/")
    assert res_unauth.status_code == 401

    # 2. With auth gets profile
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    res_me = client.get("/api/v1/auth/me/")
    assert res_me.status_code == 200
    assert res_me.json()["full_name"] == "Me User"

    # 3. Patch updates name, email, preferred_language
    res_patch = client.patch(
        "/api/v1/auth/me/",
        {
            "full_name": "Updated Name",
            "email": "new_email@example.com",
            "preferred_language": "en",
            "role": "admin",  # should be ignored / cannot change
            "phone": "01799999999",  # should be ignored / cannot change
        },
    )
    assert res_patch.status_code == 200
    data = res_patch.json()
    assert data["full_name"] == "Updated Name"
    assert data["email"] == "new_email@example.com"
    assert data["preferred_language"] == "en"
    assert data["role"] == "guardian"  # unchanged
    assert data["phone"] == "01733445566"  # unchanged


def test_register_saves_home_area_and_returns_it(client):
    Area.objects.create(name_en="Amberkhana", name_bn="আম্বরখানা", slug="amberkhana")

    response = client.post(
        "/api/v1/auth/register/",
        {
            "full_name": "Area Guardian",
            "phone": "01711000222",
            "password": "Sylhet-Strong-2026!",
            "area": "amberkhana",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.json()["user"]["area"] == "amberkhana"


def test_register_rejects_unknown_area(client):
    response = client.post(
        "/api/v1/auth/register/",
        {
            "full_name": "Area Guardian",
            "phone": "01711000333",
            "password": "Sylhet-Strong-2026!",
            "area": "atlantis",
        },
        format="json",
    )

    assert response.status_code == 400
    assert response.json()["fields"]["area"][0]["code"] == "does_not_exist"


# --- a password may not just be the person's own details -------------------------------------


def register_with(client, **overrides):
    payload = {
        "full_name": "Rahim Uddin",
        "phone": "01712345678",
        "email": "rahim@example.com",
        "password": "Surma-River-Fresh-9",
        "role": "guardian",
    }
    payload.update(overrides)
    return client.post("/api/v1/auth/register/", payload)


def password_codes(response):
    return [e["code"] for e in response.json()["fields"]["password"]]


@pytest.mark.parametrize(
    "password",
    ["01712345678a", "rahimuddin1", "Rahim Uddin 9", "rahim@example.com1"],
    ids=["phone", "name-joined", "name", "email"],
)
def test_register_refuses_a_password_that_copies_the_persons_details(client, password):
    response = register_with(client, password=password)

    assert response.status_code == 400
    assert "password_too_similar" in password_codes(response)
    assert not User.objects.filter(phone="01712345678").exists()


def test_register_accepts_a_strong_password_unrelated_to_the_person(client):
    assert register_with(client).status_code == 201


def test_a_weak_password_gets_its_own_reason_once_not_twice(client):
    response = register_with(client, password="abc")

    codes = password_codes(response)
    assert "password_too_short" in codes
    assert codes.count("password_too_short") == 1
    assert "password_too_similar" not in codes


def test_similarity_to_the_phone_is_checked_when_only_a_phone_is_given(client):
    response = register_with(client, email="", password="01712345678x")

    assert "password_too_similar" in password_codes(response)
