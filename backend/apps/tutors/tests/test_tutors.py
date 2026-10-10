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
    assert response.json() == []


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

    assert len(data) == 1
    tutor_data = data[0]
    assert tutor_data["name"] == "Mahdi Hasan"
    assert tutor_data["initials"] == "MH"
    assert "SUST" in tutor_data["university"]
    assert tutor_data["area"] == "Amberkhana"
    assert "Physics" in tutor_data["subjects"]
    assert "HSC" in tutor_data["classes"]
    assert tutor_data["isFeatured"] is True
    assert tutor_data["isVerified"] is True
