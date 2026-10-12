"""seed_demo: realistic search data for local/staging, safe to rerun, never in production."""

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.lookups.models import Area, ClassLevel, Subject
from apps.tutors.management.commands.seed_demo import DEMO_BIO, PHONE_PREFIX
from apps.tutors.models import TutorProfile

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _development_settings(monkeypatch):
    monkeypatch.setenv("DJANGO_SETTINGS_MODULE", "config.settings.development")
    monkeypatch.delenv("ALLOW_SEED_DEMO", raising=False)


def seed(*args):
    call_command("seed_demo", *args, verbosity=0)


def test_creates_thirty_demo_tutors_with_a_mix_of_statuses():
    seed()

    profiles = TutorProfile.objects.all()
    assert profiles.count() == 30
    by_status = {
        status: profiles.filter(verification_status=status).count()
        for status in ("approved", "pending", "rejected")
    }
    assert by_status == {"approved": 26, "pending": 2, "rejected": 2}
    assert profiles.filter(gender="female").count() >= 10
    assert 0 < profiles.filter(is_featured=True).count() < 10


def test_running_twice_does_not_duplicate_anything():
    seed()
    seed()

    assert User.objects.filter(phone__startswith=PHONE_PREFIX).count() == 30
    assert TutorProfile.objects.count() == 30


def test_demo_tutors_have_no_invented_ratings_and_cannot_log_in():
    seed()

    assert not TutorProfile.objects.exclude(rating_avg=0).exists()
    assert not TutorProfile.objects.exclude(review_count=0).exists()
    assert all(not user.has_usable_password() for user in User.objects.all())
    assert set(TutorProfile.objects.values_list("bio", flat=True)) == {DEMO_BIO}


def test_every_area_subject_and_class_has_an_approved_tutor_to_find():
    seed()

    approved = {"tutors__verification_status": "approved"}
    assert not Area.objects.exclude(**approved).exists()
    assert not Subject.objects.exclude(**approved).exists()
    assert not ClassLevel.objects.exclude(**approved).exists()


def test_search_api_only_shows_the_approved_demo_tutors():
    seed()
    api = APIClient()

    page = api.get("/api/v1/tutors/", {"page_size": 50}).json()
    assert page["count"] == 26
    assert (
        api.get("/api/v1/tutors/", {"area": "amberkhana", "subject": "physics"}).status_code == 200
    )
    assert api.get("/api/v1/tutors/", {"gender": "female"}).json()["count"] > 0


def test_reset_removes_only_demo_tutors():
    real = User.objects.create_user("Real Tutor", phone="01712345678", role="tutor")
    TutorProfile.objects.create(user=real, bio="I teach maths.")
    seed()

    seed("--reset")

    assert not User.objects.filter(phone__startswith=PHONE_PREFIX).exists()
    assert User.objects.filter(pk=real.pk).exists()
    assert TutorProfile.objects.count() == 1


def test_refuses_to_overwrite_a_real_account_on_a_demo_phone():
    User.objects.create_user("Real Person", phone=f"{PHONE_PREFIX}0001", role="tutor")

    with pytest.raises(CommandError, match="real account"):
        seed()
    assert User.objects.get(phone=f"{PHONE_PREFIX}0001").full_name == "Real Person"


def test_reset_leaves_a_real_account_with_a_demo_looking_phone_alone():
    real = User.objects.create_user("Real Person", phone=f"{PHONE_PREFIX}0099", role="tutor")

    seed("--reset")

    assert User.objects.filter(pk=real.pk).exists()


def test_refuses_to_run_in_production(monkeypatch):
    monkeypatch.setenv("DJANGO_SETTINGS_MODULE", "config.settings.production")

    with pytest.raises(CommandError, match="never run in production"):
        seed()
    assert not TutorProfile.objects.exists()


def test_staging_can_opt_in_even_with_production_settings(monkeypatch):
    monkeypatch.setenv("DJANGO_SETTINGS_MODULE", "config.settings.production")
    monkeypatch.setenv("ALLOW_SEED_DEMO", "true")

    seed()

    assert TutorProfile.objects.count() == 30
