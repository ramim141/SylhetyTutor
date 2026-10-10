import pytest
from django.db import IntegrityError

from apps.accounts.forms import UserCreationForm
from apps.accounts.models import User

pytestmark = pytest.mark.django_db


def test_create_user_with_phone_defaults_to_guardian_and_mixed():
    user = User.objects.create_user("Rahim Uddin", phone="01700000000", password="pass")

    assert user.role == User.Role.GUARDIAN
    assert user.preferred_language == User.Language.MIXED
    assert user.check_password("pass")
    assert not user.is_staff


def test_create_user_with_email_only_normalizes_email():
    user = User.objects.create_user("Tanjina", email="Tanjina@EXAMPLE.com")

    assert user.phone is None
    assert user.email == "Tanjina@example.com"


def test_create_user_without_phone_or_email_is_rejected():
    with pytest.raises(ValueError):
        User.objects.create_user("No Contact")


def test_database_rejects_user_without_phone_or_email():
    with pytest.raises(IntegrityError):
        User.objects.create(full_name="Bypass Manager")


def test_create_superuser_is_admin_staff():
    admin = User.objects.create_superuser("Admin", phone="01800000000", password="pass")

    assert admin.is_staff and admin.is_superuser
    assert admin.role == User.Role.ADMIN


def test_admin_form_stores_blank_phone_as_null_so_many_email_only_users_fit():
    for i in range(2):
        form = UserCreationForm(
            data={
                "full_name": f"User {i}",
                "phone": "",
                "email": f"user{i}@example.com",
                "role": "guardian",
                "password1": "Str0ng!pass-word",
                "password2": "Str0ng!pass-word",
            }
        )
        assert form.is_valid(), form.errors
        assert form.save().phone is None

    assert User.objects.filter(phone__isnull=True).count() == 2
