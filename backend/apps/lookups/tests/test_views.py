import pytest
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.lookups.models import Area

pytestmark = pytest.mark.django_db


@pytest.fixture
def api_client():
    return APIClient()


def test_get_grouped_lookups(api_client):
    call_command("seed_data")

    # Inactivate one area to verify filtering
    Area.objects.filter(slug="amberkhana").update(is_active=False)

    response = api_client.get("/api/v1/lookups/")
    assert response.status_code == 200
    data = response.json()

    assert "areas" in data
    assert "subjects" in data
    assert "class_levels" in data
    assert "universities" in data

    # 13 active areas (1 was deactivated)
    assert len(data["areas"]) == 13
    assert len(data["subjects"]) == 12
    assert len(data["class_levels"]) == 5
    assert len(data["universities"]) == 3

    # Check structure of area item
    first_area = data["areas"][0]
    assert "id" in first_area
    assert "name_en" in first_area
    assert "name_bn" in first_area
    assert "slug" in first_area


def test_get_individual_lookup_lists(api_client):
    call_command("seed_data")

    res_areas = api_client.get("/api/v1/lookups/areas/")
    assert res_areas.status_code == 200
    assert len(res_areas.json()) == 14

    res_subjects = api_client.get("/api/v1/lookups/subjects/")
    assert res_subjects.status_code == 200
    assert len(res_subjects.json()) == 12

    res_classes = api_client.get("/api/v1/lookups/class-levels/")
    assert res_classes.status_code == 200
    assert len(res_classes.json()) == 5

    res_unis = api_client.get("/api/v1/lookups/universities/")
    assert res_unis.status_code == 200
    assert len(res_unis.json()) == 3
