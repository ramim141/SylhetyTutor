import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.lookups.models import Area, ClassLevel, Subject, University
from apps.tutors.models import TutorProfile

User = get_user_model()
pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


def test_tutor_list_api_empty(api_client):
    response = api_client.get("/api/v1/tutors/")
    assert response.status_code == 200
    assert response.json() == {"count": 0, "next": None, "previous": None, "results": []}


def test_create_and_fetch_tutor(api_client):
    user = User.objects.create_user(
        full_name="Mahdi Hasan",
        phone="01711223344",
        password="secretpassword123",
        role="tutor",
    )
    uni = University.objects.create(
        name_en="Shahjalal University of Science and Technology",
        name_bn="শাহজালাল বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয়",
        short_name="SUST",
        slug="sust",
    )
    subject = Subject.objects.create(
        name_en="Physics",
        name_bn="পদার্থবিজ্ঞান",
        slug="physics",
    )
    area = Area.objects.create(
        name_en="Amberkhana",
        name_bn="আম্বরখানা",
        slug="amberkhana",
    )
    class_lvl = ClassLevel.objects.create(
        name_en="HSC",
        name_bn="এইচএসসি",
        slug="hsc",
    )

    tutor = TutorProfile.objects.create(
        user=user,
        university=uni,
        department="Physics",
        fee_min=4000,
        fee_max=7000,
        verification_status="approved",
        is_featured=True,
    )
    tutor.subjects.add(subject)
    tutor.areas.add(area)
    tutor.class_levels.add(class_lvl)

    response = api_client.get("/api/v1/tutors/")
    assert response.status_code == 200
    data = response.json()

    assert data["count"] == 1
    tutor_data = data["results"][0]
    assert tutor_data["name"] == "Mahdi Hasan"
    assert tutor_data["initials"] == "MH"
    assert tutor_data["university"]["short_name"] == "SUST"
    assert tutor_data["department"] == "Physics"
    assert tutor_data["area"]["name_en"] == "Amberkhana"
    assert [x["name_en"] for x in tutor_data["subjects"]] == ["Physics"]
    assert [x["name_en"] for x in tutor_data["classes"]] == ["HSC"]
    assert tutor_data["isFeatured"] is True
    assert tutor_data["isVerified"] is True


def test_new_tutor_profile_is_a_hidden_draft_with_no_fake_rating_or_fee(api_client):
    user = User.objects.create_user("New Tutor", phone="01912345678", role="tutor")
    profile = TutorProfile.objects.create(user=user)

    assert profile.verification_status == TutorProfile.VerificationStatus.DRAFT
    assert profile.gender == "" and profile.fee_min is None and profile.fee_max is None
    assert profile.rating_avg == 0
    assert api_client.get("/api/v1/tutors/").json()["results"] == []


def test_card_names_come_in_both_languages_for_every_lookup(api_client):
    user = User.objects.create_user("Bangla Tutor", phone="01711000111", role="tutor")
    profile = TutorProfile.objects.create(
        user=user,
        verification_status="approved",
        university=University.objects.create(
            name_en="Shahjalal", name_bn="শাহজালাল", short_name="SUST", slug="sust2"
        ),
    )
    profile.subjects.add(Subject.objects.create(name_en="Math", name_bn="গণিত", slug="m2"))
    profile.class_levels.add(ClassLevel.objects.create(name_en="HSC", name_bn="এইচএসসি", slug="h2"))
    profile.areas.add(Area.objects.create(name_en="Zindabazar", name_bn="জিন্দাবাজার", slug="z2"))

    card = api_client.get("/api/v1/tutors/").json()["results"][0]

    assert card["university"]["name_bn"] == "শাহজালাল"
    assert card["area"]["name_bn"] == "জিন্দাবাজার"
    assert card["subjects"][0]["name_bn"] == "গণিত"
    assert card["classes"][0]["name_bn"] == "এইচএসসি"


def test_a_card_never_invents_a_university_or_area_when_there_is_none(api_client):
    user = User.objects.create_user("Bare Tutor", phone="01711000222", role="tutor")
    TutorProfile.objects.create(user=user, verification_status="approved")

    card = api_client.get("/api/v1/tutors/").json()["results"][0]

    assert card["university"] is None and card["area"] is None
    assert card["subjects"] == [] and card["classes"] == []
    assert card["department"] == "" and card["feeMin"] is None
    assert "Sylhet University" not in str(card) and "Sylhet City" not in str(card)
