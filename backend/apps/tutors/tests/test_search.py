"""Tutor search API (Sprint 2): filters, sort, pagination, and what never leaks."""

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.lookups.models import Area, ClassLevel, Subject, University
from apps.tutors.models import TutorProfile

pytestmark = pytest.mark.django_db

URL = "/api/v1/tutors/"


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def lookups():
    return {
        "amberkhana": Area.objects.create(
            name_en="Amberkhana", name_bn="আম্বরখানা", slug="amberkhana"
        ),
        "zindabazar": Area.objects.create(
            name_en="Zindabazar", name_bn="জিন্দাবাজার", slug="zindabazar"
        ),
        "physics": Subject.objects.create(name_en="Physics", name_bn="পদার্থবিজ্ঞান", slug="physics"),
        "math": Subject.objects.create(name_en="Math", name_bn="গণিত", slug="math"),
        "hsc": ClassLevel.objects.create(name_en="HSC", name_bn="এইচএসসি", slug="hsc"),
        "ssc": ClassLevel.objects.create(name_en="SSC", name_bn="এসএসসি", slug="ssc"),
        "sust": University.objects.create(
            name_en="SUST", name_bn="সাস্ট", short_name="SUST", slug="sust"
        ),
        "leading": University.objects.create(
            name_en="Leading", name_bn="লিডিং", short_name="Leading", slug="leading"
        ),
    }


_phone = iter(range(10000000, 99999999))


def make_tutor(name, *, areas=(), subjects=(), classes=(), status="approved", **fields):
    user = User.objects.create_user(name, phone=f"017{next(_phone)}", role="tutor")
    tutor = TutorProfile.objects.create(user=user, verification_status=status, **fields)
    tutor.areas.set(areas)
    tutor.subjects.set(subjects)
    tutor.class_levels.set(classes)
    return tutor


def names(response):
    return [row["name"] for row in response.json()["results"]]


def test_only_approved_active_tutors_are_listed(api):
    make_tutor("Approved One")
    make_tutor("Pending One", status="pending")
    make_tutor("Rejected One", status="rejected")
    suspended = make_tutor("Suspended One")
    suspended.user.is_active = False
    suspended.user.save()

    assert names(api.get(URL)) == ["Approved One"]


def test_filter_by_area_and_subject_combine(api, lookups):
    make_tutor("Rahim", areas=[lookups["amberkhana"]], subjects=[lookups["physics"]])
    make_tutor("Karim", areas=[lookups["amberkhana"]], subjects=[lookups["math"]])
    make_tutor("Salma", areas=[lookups["zindabazar"]], subjects=[lookups["physics"]])

    assert set(names(api.get(URL, {"area": "amberkhana"}))) == {"Rahim", "Karim"}
    assert names(api.get(URL, {"area": "amberkhana", "subject": "physics"})) == ["Rahim"]


def test_filter_by_class_level_gender_and_university(api, lookups):
    make_tutor("Rahim", classes=[lookups["hsc"]], gender="male", university=lookups["sust"])
    make_tutor("Salma", classes=[lookups["ssc"]], gender="female", university=lookups["leading"])

    assert names(api.get(URL, {"class_level": "hsc"})) == ["Rahim"]
    assert names(api.get(URL, {"gender": "female"})) == ["Salma"]
    assert names(api.get(URL, {"university": "leading"})) == ["Salma"]


def test_invalid_gender_is_rejected_with_error_shape(api):
    response = api.get(URL, {"gender": "robot"})
    assert response.status_code == 400
    assert response.json()["code"] == "invalid"
    assert "gender" in response.json()["fields"]


def test_unknown_slug_returns_empty_not_error(api):
    make_tutor("Rahim")
    response = api.get(URL, {"area": "atlantis"})
    assert response.status_code == 200
    assert response.json()["count"] == 0


def test_fee_filters_match_overlapping_ranges(api):
    make_tutor("Cheap", fee_min=2000, fee_max=3000)
    make_tutor("Mid", fee_min=4000, fee_max=6000)
    make_tutor("Pricey", fee_min=8000, fee_max=12000)

    assert set(names(api.get(URL, {"fee_max": 3500}))) == {"Cheap"}
    assert set(names(api.get(URL, {"fee_min": 7000}))) == {"Pricey"}
    assert set(names(api.get(URL, {"fee_min": 3500, "fee_max": 5000}))) == {"Mid"}
    assert api.get(URL, {"fee_min": -1}).status_code == 400


def test_free_text_search_matches_name_subject_and_bangla(api, lookups):
    make_tutor("Rahim Uddin", subjects=[lookups["physics"]])
    make_tutor("Karim Ali", areas=[lookups["zindabazar"]])

    assert names(api.get(URL, {"q": "rahim"})) == ["Rahim Uddin"]
    assert names(api.get(URL, {"q": "physics"})) == ["Rahim Uddin"]
    assert names(api.get(URL, {"q": "জিন্দাবাজার"})) == ["Karim Ali"]


def test_multi_value_match_does_not_duplicate_a_tutor(api, lookups):
    make_tutor("Rahim", areas=[lookups["amberkhana"], lookups["zindabazar"]])
    assert api.get(URL, {"q": "bazar"}).json()["count"] == 1
    assert api.get(URL, {"area": "amberkhana"}).json()["count"] == 1


def test_default_sort_puts_featured_first_then_rating(api):
    make_tutor("Plain Low", rating_avg=3, review_count=2)
    make_tutor("Plain High", rating_avg=5, review_count=9)
    make_tutor("Featured", is_featured=True, rating_avg=0)

    assert names(api.get(URL)) == ["Featured", "Plain High", "Plain Low"]


def test_sort_rating_and_newest(api):
    older = make_tutor("Older", rating_avg=5, review_count=4)
    newer = make_tutor("Newer", rating_avg=3, review_count=1)
    assert older.created_at <= newer.created_at

    assert names(api.get(URL, {"sort": "rating"})) == ["Older", "Newer"]
    assert names(api.get(URL, {"sort": "newest"})) == ["Newer", "Older"]
    assert api.get(URL, {"sort": "random"}).status_code == 400


def test_results_are_paginated_by_twenty(api):
    for i in range(23):
        make_tutor(f"Tutor {i:02d}")

    first = api.get(URL).json()
    assert first["count"] == 23
    assert len(first["results"]) == 20
    assert first["next"] is not None

    second = api.get(URL, {"page": 2}).json()
    assert len(second["results"]) == 3
    assert len(api.get(URL, {"page_size": 500}).json()["results"]) == 23


def test_card_never_exposes_contact_details(api):
    tutor = make_tutor("Rahim")
    tutor.user.email = "rahim@example.com"
    tutor.user.save()

    card = api.get(URL).json()["results"][0]
    flat = str(card)
    assert tutor.user.phone not in flat
    assert "rahim@example.com" not in flat
    assert not {"phone", "email", "address"} & set(card)


def test_list_query_count_does_not_grow_with_results(api, lookups, django_assert_max_num_queries):
    for i in range(10):
        make_tutor(
            f"Tutor {i}",
            areas=[lookups["amberkhana"]],
            subjects=[lookups["physics"]],
            classes=[lookups["hsc"]],
            university=lookups["sust"],
        )
    with django_assert_max_num_queries(8):
        assert api.get(URL).status_code == 200
