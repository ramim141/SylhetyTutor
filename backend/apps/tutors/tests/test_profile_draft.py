"""Tutor registration, backend half: save a draft step by step, then submit for verification."""

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.lookups.models import Area, ClassLevel, Subject, University
from apps.tutors.models import TutorProfile

from .helpers import upload_both

pytestmark = pytest.mark.django_db

ME = "/api/v1/tutors/me/"
SUBMIT = "/api/v1/tutors/me/submit/"
PASSWORD = "Sylhet-Strong-2026!"

COMPLETE = {
    "gender": "female",
    "university": "sust",
    "department": "Physics",
    "year": "3rd Year",
    "student_id_number": "2021331001",
    "bio": "I love teaching physics.",
    "fee_min": 4000,
    "fee_max": 6000,
    "subjects": ["physics", "math"],
    "class_levels": ["hsc"],
    "areas": ["amberkhana"],
    "availability": [{"day": "sat", "slot": "evening"}, {"day": "mon", "slot": "morning"}],
}


@pytest.fixture(autouse=True)
def lookups():
    University.objects.create(name_en="SUST", name_bn="সাস্ট", short_name="SUST", slug="sust")
    University.objects.create(name_en="Old", name_bn="পুরোনো", slug="old", is_active=False)
    for slug, en, bn in [("physics", "Physics", "পদার্থ"), ("math", "Math", "গণিত")]:
        Subject.objects.create(name_en=en, name_bn=bn, slug=slug)
    ClassLevel.objects.create(name_en="HSC", name_bn="এইচএসসি", slug="hsc")
    Area.objects.create(name_en="Amberkhana", name_bn="আম্বরখানা", slug="amberkhana")


def complete(client):
    """Everything the form asks for: the six steps, documents included."""
    assert client.patch(ME, COMPLETE).status_code == 200
    upload_both(client)


def sign_in(role="tutor", phone="01712345678"):
    user = User.objects.create_user("Nusrat Jahan", phone=phone, password=PASSWORD, role=role)
    client = APIClient()
    client.force_authenticate(user)
    return client, user


@pytest.fixture
def tutor():
    return sign_in()


def set_status(user, status):
    TutorProfile.objects.filter(user=user).update(verification_status=status)


# --- who may call it -------------------------------------------------------


def test_anonymous_gets_401():
    for call in (APIClient().get(ME), APIClient().patch(ME, {}), APIClient().post(SUBMIT)):
        assert call.status_code == 401


@pytest.mark.parametrize("role", ["guardian", "admin"])
def test_only_tutors_have_a_tutor_profile(role):
    client, _ = sign_in(role, phone="01799999999")
    assert client.get(ME).status_code == 403
    assert client.patch(ME, {"bio": "x"}).status_code == 403
    assert client.post(SUBMIT).status_code == 403


# --- reading ---------------------------------------------------------------


def test_first_visit_creates_an_empty_draft_that_lists_what_is_missing(tutor):
    client, user = tutor

    data = client.get(ME).json()

    assert data["status"] == "draft"
    assert data["can_edit"] is True
    assert data["gender"] == "" and data["fee_min"] is None and data["university"] is None
    assert data["subjects"] == [] and data["availability"] == []
    assert data["documents"] == {"nid": False, "student_id": False}
    assert data["missing"] == [
        "gender", "nid_photo", "student_id_photo", "university", "department", "year",
        "student_id_number", "subjects", "class_levels", "areas", "availability",
        "fee_min", "fee_max",
    ]  # fmt: skip
    assert TutorProfile.objects.filter(user=user).count() == 1


def test_visiting_twice_does_not_create_a_second_profile(tutor):
    client, user = tutor
    client.get(ME)
    client.get(ME)
    assert TutorProfile.objects.filter(user=user).count() == 1


# --- saving a draft --------------------------------------------------------


def test_each_step_saves_on_its_own_and_keeps_the_rest(tutor):
    client, _ = tutor

    client.patch(ME, {"gender": "female", "university": "sust", "department": "Physics"})
    client.patch(ME, {"subjects": ["physics"], "areas": ["amberkhana"]})
    data = client.patch(ME, {"bio": "Hello"}).json()

    assert data["gender"] == "female" and data["university"] == "sust"
    assert data["department"] == "Physics"
    assert data["subjects"] == ["physics"] and data["areas"] == ["amberkhana"]
    assert data["bio"] == "Hello"
    assert "gender" not in data["missing"] and "subjects" not in data["missing"]
    assert "year" in data["missing"]


def test_lists_are_replaced_not_merged(tutor):
    client, _ = tutor
    client.patch(ME, {"subjects": ["physics", "math"]})

    data = client.patch(ME, {"subjects": ["math"]}).json()

    assert data["subjects"] == ["math"]
    assert client.patch(ME, {"subjects": []}).json()["subjects"] == []


def test_availability_is_stored_once_per_slot_and_returned_in_week_order(tutor):
    client, _ = tutor
    slots = [
        {"day": "mon", "slot": "evening"},
        {"day": "sat", "slot": "morning"},
        {"day": "sat", "slot": "morning"},
        {"day": "sat", "slot": "evening"},
    ]

    data = client.patch(ME, {"availability": slots}).json()

    assert data["availability"] == [
        {"day": "sat", "slot": "morning"},
        {"day": "sat", "slot": "evening"},
        {"day": "mon", "slot": "evening"},
    ]


@pytest.mark.parametrize(
    ("payload", "field", "code"),
    [
        ({"gender": "robot"}, "gender", "invalid_choice"),
        ({"university": "atlantis"}, "university", "does_not_exist"),
        ({"university": "old"}, "university", "does_not_exist"),
        ({"subjects": ["physics", "nope"]}, "subjects", "does_not_exist"),
        ({"fee_min": 0}, "fee_min", "min_value"),
        ({"fee_max": "abc"}, "fee_max", "invalid"),
        ({"bio": "x" * 401}, "bio", "max_length"),
        ({"availability": [{"day": "xyz", "slot": "morning"}]}, "availability", None),
        ({"availability": [{"day": "sat", "slot": "midnight"}]}, "availability", None),
    ],
)
def test_bad_values_are_reported_per_field_and_nothing_is_saved(tutor, payload, field, code):
    client, user = tutor
    response = client.patch(ME, payload)

    assert response.status_code == 400
    assert response.json()["code"] == "invalid"
    assert field in response.json()["fields"]
    if code:
        assert response.json()["fields"][field][0]["code"] == code
    assert TutorProfile.objects.get(user=user).bio == ""


def test_minimum_fee_cannot_exceed_maximum_even_across_two_saves(tutor):
    client, _ = tutor
    client.patch(ME, {"fee_max": 3000})

    response = client.patch(ME, {"fee_min": 5000})

    assert response.status_code == 400
    assert response.json()["fields"]["fee_min"][0]["code"] == "fee_range"


def test_status_and_platform_fields_cannot_be_set_through_the_profile(tutor):
    client, user = tutor
    response = client.patch(
        ME,
        {
            "verification_status": "approved",
            "is_featured": True,
            "rating_avg": 5,
            "review_count": 99,
            "rejection_reason": "x",
            "verified_by": str(user.pk),
            "bio": "fine",
        },
    )

    assert response.status_code == 200
    profile = TutorProfile.objects.get(user=user)
    assert profile.verification_status == "draft"
    assert not profile.is_featured and profile.rating_avg == 0 and profile.review_count == 0
    assert profile.verified_by is None and profile.rejection_reason == ""


# --- submitting ------------------------------------------------------------


def test_submit_lists_every_missing_field_and_changes_nothing(tutor):
    client, user = tutor
    client.patch(ME, {"gender": "male", "subjects": ["physics"]})

    response = client.post(SUBMIT)

    assert response.status_code == 400
    fields = response.json()["fields"]
    assert set(fields) == {
        "nid_photo", "student_id_photo", "university", "department", "year",
        "student_id_number", "fee_min", "fee_max", "class_levels", "areas", "availability",
    }  # fmt: skip
    assert all(errors[0]["code"] == "required" for errors in fields.values())
    assert TutorProfile.objects.get(user=user).verification_status == "draft"


def test_submit_moves_a_complete_profile_to_pending(tutor):
    client, user = tutor
    complete(client)

    response = client.post(SUBMIT)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "pending" and data["missing"] == []
    assert data["can_edit"] is False and data["submitted_at"] is not None
    assert TutorProfile.objects.get(user=user).verification_status == "pending"


def test_a_pending_profile_is_locked_and_cannot_be_submitted_again(tutor):
    client, user = tutor
    complete(client)
    client.post(SUBMIT)

    edit = client.patch(ME, {"bio": "sneaky change"})
    again = client.post(SUBMIT)

    assert edit.status_code == 409 and edit.json()["code"] == "profile_locked"
    assert again.status_code == 409 and again.json()["code"] == "already_submitted"
    assert TutorProfile.objects.get(user=user).bio == COMPLETE["bio"]


def test_pending_and_draft_tutors_stay_out_of_search(tutor):
    client, _ = tutor
    complete(client)
    assert APIClient().get("/api/v1/tutors/").json()["count"] == 0

    client.post(SUBMIT)
    assert APIClient().get("/api/v1/tutors/").json()["count"] == 0


def test_a_rejected_tutor_sees_the_reason_fixes_it_and_resubmits(tutor):
    client, user = tutor
    complete(client)
    client.post(SUBMIT)
    TutorProfile.objects.filter(user=user).update(
        verification_status="rejected", rejection_reason="Student ID is unreadable"
    )

    seen = client.get(ME).json()
    assert seen["status"] == "rejected" and seen["can_edit"] is True
    assert seen["rejection_reason"] == "Student ID is unreadable"

    assert client.patch(ME, {"student_id_number": "2021331999"}).status_code == 200
    resubmitted = client.post(SUBMIT).json()
    assert resubmitted["status"] == "pending"
    assert resubmitted["rejection_reason"] == ""


# --- after approval --------------------------------------------------------


def approve(user):
    TutorProfile.objects.filter(user=user).update(
        verification_status="approved", verified_at=timezone.now()
    )


def test_approved_tutor_can_change_bio_fees_and_teaching_but_not_identity(tutor):
    client, user = tutor
    complete(client)
    client.post(SUBMIT)
    approve(user)

    ok = client.patch(ME, {"bio": "New bio", "fee_min": 4500, "areas": ["amberkhana"]})
    assert ok.status_code == 200 and ok.json()["bio"] == "New bio"
    assert ok.json()["status"] == "approved"

    for field, value in [
        ("university", "sust"),
        ("student_id_number", "999"),
        ("department", "Chemistry"),
        ("gender", "male"),
        ("year", "4th Year"),
    ]:
        locked = client.patch(ME, {field: value})
        assert locked.status_code == 400
        assert locked.json()["fields"][field][0]["code"] == "locked"
    assert TutorProfile.objects.get(user=user).department == "Physics"


def test_an_approved_tutor_cannot_submit_again(tutor):
    client, user = tutor
    complete(client)
    client.post(SUBMIT)
    approve(user)

    assert client.post(SUBMIT).status_code == 409


# --- model guard -----------------------------------------------------------


def test_the_model_refuses_to_approve_an_incomplete_profile(tutor):
    from django.core.exceptions import ValidationError

    _, user = tutor
    profile = TutorProfile.objects.create(user=user, verification_status="approved")

    with pytest.raises(ValidationError, match="incomplete"):
        profile.full_clean()


def test_the_public_address_appears_once_approved(tutor):
    client, user = tutor
    complete(client)
    assert client.get(ME).json()["slug"] is None

    client.post(SUBMIT)
    assert client.get(ME).json()["slug"] is None  # pending: nothing public yet

    profile = TutorProfile.objects.get(user=user)
    profile.verification_status = "approved"
    profile.save()

    assert client.get(ME).json()["slug"] == "nusrat-jahan-math-physics"  # equal sort order: by slug


def test_progress_can_be_worked_out_from_missing_and_required_total(tutor):
    client, _ = tutor
    first = client.get(ME).json()
    assert first["required_total"] == 13 and len(first["missing"]) == 13

    client.patch(ME, {"gender": "female", "subjects": ["physics"]})
    after = client.get(ME).json()

    assert after["required_total"] == 13
    assert after["required_total"] - len(after["missing"]) == 2
