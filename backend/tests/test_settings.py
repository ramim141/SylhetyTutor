import importlib
import sys

import pytest
from django.core.exceptions import ImproperlyConfigured

from config.settings.base import database_from_url

GOOD_KEY = "x" * 60


def _load_production(monkeypatch, **env):
    defaults = {
        "DJANGO_SECRET_KEY": GOOD_KEY,
        "DJANGO_ALLOWED_HOSTS": "sylhetytutor.com",
        "DATABASE_URL": "postgres://u:p@db:5432/st",
    }
    for key, value in {**defaults, **env}.items():
        if value is None:
            monkeypatch.delenv(key, raising=False)
        else:
            monkeypatch.setenv(key, value)
    for name in ["config.settings.production", "config.settings.base"]:
        sys.modules.pop(name, None)
    monkeypatch.setattr("dotenv.load_dotenv", lambda *a, **k: False)
    return importlib.import_module("config.settings.production")


@pytest.fixture(autouse=True)
def _restore_settings_modules():
    yield
    for name in ["config.settings.production", "config.settings.base"]:
        sys.modules.pop(name, None)


def test_production_loads_with_required_env(monkeypatch):
    prod = _load_production(monkeypatch)

    assert prod.DEBUG is False
    assert prod.SECURE_SSL_REDIRECT is True
    assert prod.DATABASES["default"]["ENGINE"] == "django.db.backends.postgresql"


@pytest.mark.parametrize(
    "env",
    [
        {"DJANGO_SECRET_KEY": None},
        {"DJANGO_SECRET_KEY": "short"},
        {"DJANGO_SECRET_KEY": "django-insecure-" + "x" * 60},
        {"DJANGO_ALLOWED_HOSTS": "*"},
        {"DATABASE_URL": None},
    ],
)
def test_production_refuses_unsafe_config(monkeypatch, env):
    with pytest.raises(ImproperlyConfigured):
        _load_production(monkeypatch, **env)


def test_database_from_url_decodes_credentials():
    db = database_from_url("postgres://app%40user:p%23ss@db.example.com:6543/sylhety")

    assert db["USER"] == "app@user"
    assert db["PASSWORD"] == "p#ss"
    assert db["HOST"] == "db.example.com"
    assert db["PORT"] == 6543
    assert db["NAME"] == "sylhety"
