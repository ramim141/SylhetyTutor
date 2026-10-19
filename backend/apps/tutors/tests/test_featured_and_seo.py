import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.matching.tests.helpers import approved_tutor, make_lookups

pytestmark = pytest.mark.django_db


def test_featured_tutors_endpoint():
    make_lookups()
    approved_tutor(phone="01711111111", name="Featured One")
    approved_tutor(phone="01722222222", name="Featured Two")

    client = APIClient()
    res = client.get("/api/v1/tutors/featured/")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) == 2


def test_sitemap_xml():
    make_lookups()
    client = APIClient()
    res = client.get("/sitemap.xml")
    assert res.status_code == 200
    assert res["Content-Type"] == "application/xml"
    content = res.content.decode("utf-8")
    assert "<urlset" in content
    assert "/tutors" in content
    assert "/about" in content
    assert "/safety" in content


def test_robots_txt():
    client = APIClient()
    res = client.get("/robots.txt")
    assert res.status_code == 200
    assert res["Content-Type"] == "text/plain"
    content = res.content.decode("utf-8")
    assert "User-agent: *" in content
    assert "Disallow: /admin/" in content
    assert "Sitemap:" in content


def test_registration_with_acquisition_utm():
    client = APIClient()
    res = client.post(
        "/api/v1/auth/register/",
        {
            "full_name": "UTM Test User",
            "phone": "01788888888",
            "password": "StrongPassword123#@",
            "role": "guardian",
            "acquisition_source": "facebook",
            "acquisition_medium": "cpc",
            "acquisition_campaign": "launch_sylhet_2026",
        },
    )
    assert res.status_code == 201
    user = User.objects.get(phone="01788888888")
    assert user.acquisition_source == "facebook"
    assert user.acquisition_medium == "cpc"
    assert user.acquisition_campaign == "launch_sylhet_2026"
