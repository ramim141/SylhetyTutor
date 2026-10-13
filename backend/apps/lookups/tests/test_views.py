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


def test_grouped_lookups_are_served_from_cache_after_the_first_request(
    api_client, django_assert_num_queries
):
    call_command("seed_data")
    first = api_client.get("/api/v1/lookups/").json()

    with django_assert_num_queries(0):
        second = api_client.get("/api/v1/lookups/").json()

    assert second == first


@pytest.mark.parametrize(
    "make",
    [
        lambda: Area.objects.create(name_en="New Area", name_bn="নতুন", slug="new-area"),
        lambda: Area.objects.get(slug="zindabazar").delete(),
        lambda: Area.objects.get(slug="zindabazar").save(),
    ],
    ids=["create", "delete", "save"],
)
def test_changing_a_lookup_clears_the_cache(api_client, make):
    call_command("seed_data")
    api_client.get("/api/v1/lookups/")  # fills the cache

    make()

    after = api_client.get("/api/v1/lookups/").json()["areas"]
    assert {a["slug"] for a in after} == set(
        Area.objects.filter(is_active=True).values_list("slug", flat=True)
    )


def test_deactivating_through_the_admin_form_path_is_visible_immediately(api_client):
    call_command("seed_data")
    assert len(api_client.get("/api/v1/lookups/").json()["areas"]) == 14

    area = Area.objects.get(slug="amberkhana")
    area.is_active = False
    area.save()

    slugs = [a["slug"] for a in api_client.get("/api/v1/lookups/").json()["areas"]]
    assert "amberkhana" not in slugs
