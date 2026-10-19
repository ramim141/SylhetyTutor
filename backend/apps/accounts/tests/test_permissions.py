"""Role permission classes (Sprint_1.md A9) — behaviour per role, anonymous and object ownership."""

from types import SimpleNamespace

import pytest
from django.contrib.auth.models import AnonymousUser
from rest_framework.test import APIRequestFactory

from apps.accounts.models import User
from apps.accounts.permissions import IsAdmin, IsGuardian, IsGuardianOrAdmin, IsOwnerOrAdmin, IsTutor

pytestmark = pytest.mark.django_db

PASSWORD = "Sylhet-Strong-2026!"


def make_user(role, phone, **extra):
    return User.objects.create_user("Test", phone=phone, password=PASSWORD, role=role, **extra)


def request_as(user):
    request = APIRequestFactory().get("/")
    request.user = user
    return request


@pytest.fixture
def guardian():
    return make_user("guardian", "01711111111")


@pytest.fixture
def tutor():
    return make_user("tutor", "01722222222")


@pytest.fixture
def admin():
    return make_user("admin", "01733333333")


@pytest.mark.parametrize(
    ("permission", "allowed_role"),
    [(IsGuardian, "guardian"), (IsTutor, "tutor"), (IsAdmin, "admin")],
)
def test_role_permission_allows_only_its_role(permission, allowed_role, guardian, tutor, admin):
    users = {"guardian": guardian, "tutor": tutor, "admin": admin}
    for role, user in users.items():
        assert permission().has_permission(request_as(user), None) is (role == allowed_role)


@pytest.mark.parametrize("permission", [IsGuardian, IsTutor, IsAdmin])
def test_anonymous_user_is_always_denied(permission):
    assert permission().has_permission(request_as(AnonymousUser()), None) is False


def test_staff_flag_counts_as_admin(guardian):
    guardian.is_staff = True
    assert IsAdmin().has_permission(request_as(guardian), None) is True


def test_is_guardian_or_admin_allows_both(guardian, tutor, admin):
    perm = IsGuardianOrAdmin()
    assert perm.has_permission(request_as(guardian), None) is True
    assert perm.has_permission(request_as(admin), None) is True
    assert perm.has_permission(request_as(tutor), None) is False
    assert perm.has_permission(request_as(AnonymousUser()), None) is False


def test_owner_or_admin_object_permission(guardian, tutor, admin):
    owned_by_guardian = SimpleNamespace(user=guardian)
    permission = IsOwnerOrAdmin()

    assert permission.has_object_permission(request_as(guardian), None, owned_by_guardian)
    assert not permission.has_object_permission(request_as(tutor), None, owned_by_guardian)
    assert permission.has_object_permission(request_as(admin), None, owned_by_guardian)
    assert not permission.has_object_permission(
        request_as(AnonymousUser()), None, owned_by_guardian
    )


def test_owner_permission_accepts_the_user_object_itself(guardian, tutor):
    assert IsOwnerOrAdmin().has_object_permission(request_as(guardian), None, guardian)
    assert not IsOwnerOrAdmin().has_object_permission(request_as(tutor), None, guardian)
