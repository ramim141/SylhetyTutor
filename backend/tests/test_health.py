def test_health_check_returns_ok(client):
    response = client.get("/api/v1/health/")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_openapi_schema_is_served(client):
    response = client.get("/api/schema/")

    assert response.status_code == 200
