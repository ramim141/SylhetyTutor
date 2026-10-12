"""A tutor's public page and its address (slug)."""

import json

import pytest
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.lookups.models import Area, ClassLevel, Subject, University
from apps.tutors.models import TutorAvailability, TutorProfile
from apps.tutors.slugs import RESERVED

pytestmark = pytest.mark.django_db

_phone = iter(range(10000000, 99999999))


@pytest.fixture(autouse=True)
def lookups():
    return {
        "physics": Subject.objects.create(
            name_en="Physics", name_bn="পদার্থ", slug="physics", sort_order=1
        ),
        "math": Subject.objects.create(name_en="Math", name_bn="গণিত", slug="math", sort_order=2),
        "chemistry": Subject.objects.create(
            name_en="Chemistry", name_bn="রসায়ন", slug="chemistry", sort_order=3
        ),
        "hsc": ClassLevel.objects.create(name_en="HSC", name_bn="এইচএসসি", slug="hsc"),
        "amberkhana": Area.objects.create(
            name_en="Amberkhana", name_bn="আম্বরখানা", slug="amberkhana"
        ),
        "sust": University.objects.create(
            name_en="SUST", name_bn="সাস্ট", short_name="SUST", slug="sust"
        ),
    }


def make_tutor(name="Rahim Uddin", status="approved", subjects=("physics", "math"), **fields):
    """Built in the real order: subjects exist first, approval comes last (that is when the
    slug is made)."""
    account = {k: fields.pop(k) for k in ("is_active", "email", "avatar_url") if k in fields}
    user = User.objects.create_user(name, phone=f"018{next(_phone)}", role="tutor", **account)
    first_status = "pending" if status == "approved" else status
    profile = TutorProfile.objects.create(user=user, verification_status=first_status, **fields)
    profile.subjects.set(Subject.objects.filter(slug__in=subjects))
    if status == "approved":
        profile.verification_status = "approved"
        profile.save()
    return profile


def reload(profile):
    return TutorProfile.objects.get(pk=profile.pk)


# --- the slug ------------------------------------------------------------------


def test_an_approved_profile_gets_a_slug_from_its_name(lookups):
    assert make_tutor("Rahim Uddin", subjects=()).slug == "rahim-uddin"


def test_the_slug_includes_up_to_two_subjects_once_they_exist(lookups):
    profile = make_tutor("Rahim Uddin", status="draft")
    profile.subjects.set(Subject.objects.filter(slug__in=["chemistry", "physics", "math"]))
    assert profile.slug is None

    profile.verification_status = "approved"
    profile.save()

    assert profile.slug == "rahim-uddin-physics-math"  # by sort order, two of three


def test_drafts_pending_and_rejected_profiles_have_no_slug(lookups):
    for status in ("draft", "pending", "rejected"):
        assert make_tutor(status=status).slug is None


def test_a_slug_never_changes_after_it_is_made(lookups):
    profile = make_tutor("Rahim Uddin")
    first = profile.slug

    profile.subjects.set(Subject.objects.filter(slug="chemistry"))
    profile.user.full_name = "Someone Else"
    profile.user.save()
    profile.save()

    assert reload(profile).slug == first


def test_two_tutors_with_the_same_name_get_different_slugs(lookups):
    first = make_tutor("Rahim Uddin")
    second = make_tutor("Rahim Uddin")
    third = make_tutor("Rahim Uddin")

    assert [first.slug, second.slug, third.slug] == [
        "rahim-uddin-physics-math",
        "rahim-uddin-physics-math-2",
        "rahim-uddin-physics-math-3",
    ]


def test_a_bengali_name_falls_back_to_a_plain_word(lookups):
    assert make_tutor("রহিম উদ্দিন", subjects=()).slug == "tutor"
    assert make_tutor("রহিম উদ্দিন", subjects=("physics",)).slug == "physics"


@pytest.mark.parametrize("word", sorted(RESERVED))
def test_a_slug_never_collides_with_an_address_that_means_something_else(lookups, word):
    profile = make_tutor(word.title() if len(word) > 1 else word + "x", subjects=())
    assert profile.slug not in RESERVED


def test_a_very_long_name_still_gives_a_valid_slug(lookups):
    slug = make_tutor("A" * 150, subjects=("physics",)).slug
    assert len(slug) <= 100 and slug == slug.strip("-")


def test_approving_with_an_update_style_save_also_stores_the_slug(lookups):
    profile = make_tutor(status="pending")
    profile.verification_status = "approved"
    profile.save(update_fields=["verification_status"])

    assert reload(profile).slug == "rahim-uddin-physics-math"


# --- the page --------------------------------------------------------------------


def get(slug):
    return APIClient().get(f"/api/v1/tutors/{slug}/")


def test_anyone_can_open_an_approved_tutors_page(lookups):
    profile = make_tutor(
        gender="female",
        university=lookups["sust"],
        department="Physics",
        year="3rd Year",
        bio="I teach physics.",
        fee_min=3000,
        fee_max=5000,
        is_featured=True,
        avatar_url="https://i.ibb.co/a/b.jpg",
    )
    profile.class_levels.set([lookups["hsc"]])
    profile.areas.set([lookups["amberkhana"]])
    for day, slot in (("mon", "evening"), ("sat", "morning"), ("sat", "evening")):
        TutorAvailability.objects.create(tutor=profile, day=day, slot=slot)

    response = get(profile.slug)

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Rahim Uddin" and data["slug"] == profile.slug
    assert data["university"] == {
        "slug": "sust",
        "name_en": "SUST",
        "name_bn": "সাস্ট",
        "short_name": "SUST",
    }
    assert [s["slug"] for s in data["subjects"]] == ["physics", "math"] or {
        s["slug"] for s in data["subjects"]
    } == {"physics", "math"}
    assert data["subjects"][0]["name_bn"] in ("পদার্থ", "গণিত")
    assert data["classLevels"][0]["slug"] == "hsc" and data["areas"][0]["name_bn"] == "আম্বরখানা"
    assert data["availability"] == [
        {"day": "sat", "slot": "morning"},
        {"day": "sat", "slot": "evening"},
        {"day": "mon", "slot": "evening"},
    ]
    assert (data["feeMin"], data["feeMax"], data["gender"]) == (3000, 5000, "female")
    assert data["avatarUrl"] == "https://i.ibb.co/a/b.jpg" and data["isFeatured"] is True


def test_a_tutor_with_no_reviews_shows_a_count_of_zero_not_an_invented_rating(lookups):
    data = get(make_tutor().slug).json()

    assert data["reviewCount"] == 0 and data["rating"] == 0


def test_the_page_exposes_nothing_private(lookups):
    profile = make_tutor(
        email="rahim@example.com",
        student_id_number="2021331001",
        department="Physics",
        rejection_reason="should never show",
    )
    response = get(profile.slug)
    body = response.content.decode()

    for secret in (profile.user.phone, "rahim@example.com", "2021331001", "should never show"):
        assert secret not in body
    forbidden = {"phone", "email", "student_id_number", "nid_photo", "student_id_photo",
                 "rejection_reason", "verification_status", "status", "documents", "user",
                 "verified_by", "submitted_at", "address", "delete_url"}  # fmt: skip
    assert not forbidden & set(json.loads(body))


def test_a_page_with_no_photo_has_a_null_avatar(lookups):
    assert get(make_tutor().slug).json()["avatarUrl"] is None


@pytest.mark.parametrize("status", ["draft", "pending", "rejected"])
def test_only_approved_tutors_have_a_page(lookups, status):
    profile = make_tutor(status=status)
    profile.slug = f"manual-{status}"  # even if a slug somehow exists
    profile.save()

    assert get(profile.slug).status_code == 404


def test_a_suspended_account_has_no_page(lookups):
    profile = make_tutor()
    profile.user.is_active = False
    profile.user.save()

    assert get(profile.slug).status_code == 404


def test_an_unknown_address_is_404_in_the_standard_error_shape(lookups):
    response = get("nobody-here")

    assert response.status_code == 404 and response.json()["code"] == "not_found"


def test_other_tutor_routes_are_not_swallowed_by_the_profile_address(lookups):
    user = User.objects.create_user("Me Myself", phone="01955555555", role="tutor")
    client = APIClient()
    client.force_authenticate(user)

    assert client.get("/api/v1/tutors/me/").json()["status"] == "draft"
    assert APIClient().get("/api/v1/tutors/").json()["count"] == 0


def test_page_query_count_does_not_grow_with_the_profile(lookups, django_assert_max_num_queries):
    profile = make_tutor(university=lookups["sust"], fee_min=1, fee_max=2)
    profile.areas.set([lookups["amberkhana"]])
    profile.class_levels.set([lookups["hsc"]])
    for day in ("sat", "sun", "mon"):
        TutorAvailability.objects.create(tutor=profile, day=day, slot="morning")

    with django_assert_max_num_queries(7):
        assert get(profile.slug).status_code == 200


# --- the search card links to it ----------------------------------------------------


def test_a_search_card_carries_the_slug_to_link_to(lookups):
    profile = make_tutor()

    card = APIClient().get("/api/v1/tutors/").json()["results"][0]

    assert card["slug"] == profile.slug
    assert APIClient().get(f"/api/v1/tutors/{card['slug']}/").status_code == 200


def test_seed_demo_gives_every_approved_demo_tutor_a_readable_slug(lookups):
    call_command("seed_demo", verbosity=0)

    approved = TutorProfile.objects.filter(verification_status="approved")
    slugs = list(approved.values_list("slug", flat=True))
    assert len(slugs) == 26 and len(set(slugs)) == 26 and None not in slugs
    assert "rahim-uddin-math-higher-math" in slugs  # name + the subjects it really teaches
    assert (
        not TutorProfile.objects.exclude(verification_status="approved").exclude(slug=None).exists()
    )

    call_command("seed_demo", verbosity=0)  # a rerun keeps the same addresses
    assert list(approved.values_list("slug", flat=True)) == slugs
