"""Shared set-up for the matching tests: a guardian, an approved tutor and an open requirement."""

from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.lookups.models import Area, ClassLevel, Subject
from apps.tutors.models import TutorProfile

PASSWORD = "Sylhet-Strong-2026!"
REQUIREMENTS = "/api/v1/requirements/"


def make_user(role, phone, name="Test User", email=None):
    return User.objects.create_user(name, phone=phone, email=email, password=PASSWORD, role=role)


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


def make_lookups():
    for slug in ("amberkhana", "zindabazar"):
        Area.objects.get_or_create(slug=slug, defaults={"name_en": slug.title(), "name_bn": slug})
    for slug in ("hsc", "ssc"):
        ClassLevel.objects.get_or_create(
            slug=slug, defaults={"name_en": slug.upper(), "name_bn": slug}
        )
    for slug in ("math", "physics"):
        Subject.objects.get_or_create(
            slug=slug, defaults={"name_en": slug.title(), "name_bn": slug}
        )


def approved_tutor(phone="01722222222", name="Rahim Uddin", gender="male", fee=(2000, 4000)):
    user = make_user("tutor", phone, name=name)
    profile, _ = TutorProfile.objects.get_or_create(user=user)
    profile.gender = gender
    profile.fee_min, profile.fee_max = fee
    profile.verification_status = "approved"
    profile.save()
    profile.areas.set(Area.objects.filter(slug="amberkhana"))
    profile.class_levels.set(ClassLevel.objects.filter(slug="hsc"))
    profile.subjects.set(Subject.objects.filter(slug="math"))
    return client_for(user), profile


def open_requirement(client, **extra):
    data = {
        "class_level": "hsc",
        "area": "amberkhana",
        "subjects": ["math"],
        "budget_min": 3000,
        "budget_max": 5000,
    }
    data.update(extra)
    created = client.post(REQUIREMENTS, data, format="json")
    assert created.status_code == 201, created.json()
    published = client.post(f"{REQUIREMENTS}{created.json()['id']}/publish/")
    assert published.status_code == 200, published.json()
    return published.json()["id"]
