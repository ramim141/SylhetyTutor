import pytest
from django.core.cache import cache


@pytest.fixture(autouse=True)
def _clear_cache():
    """Throttle counters live in the cache; start every test from zero."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture(autouse=True)
def _private_media_in_tmp(settings, tmp_path):
    """NID / student-ID test uploads go to a throwaway folder, never into the project."""
    settings.PRIVATE_MEDIA_ROOT = tmp_path / "private_media"
