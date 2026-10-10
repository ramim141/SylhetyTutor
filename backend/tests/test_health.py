from unittest import mock

from django.db.utils import OperationalError


def test_health_check_reports_every_dependency_healthy(client, db):
    response = client.get("/api/v1/health/")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["checks"] == {"database": True, "cache": True}


def test_health_check_returns_503_when_database_is_down(client, db):
    with mock.patch("django.db.backends.utils.CursorWrapper.execute", side_effect=OperationalError):
        response = client.get("/api/v1/health/")

    assert response.status_code == 503
    assert response.json()["status"] == "degraded"
    assert response.json()["checks"]["database"] is False


def test_health_check_returns_503_when_cache_is_down(client, db):
    with mock.patch("config.views.cache.set", side_effect=ConnectionError):
        response = client.get("/api/v1/health/")

    assert response.status_code == 503
    assert response.json()["checks"] == {"database": True, "cache": False}


def test_openapi_schema_is_served(client):
    response = client.get("/api/schema/")

    assert response.status_code == 200
