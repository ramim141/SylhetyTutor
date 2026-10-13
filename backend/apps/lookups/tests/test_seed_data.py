import pytest
from django.core.management import call_command

from apps.lookups.models import Area, ClassLevel, Subject, University

pytestmark = pytest.mark.django_db


def test_seed_data_command():
    # Run seed_data command once
    call_command("seed_data")

    assert Area.objects.count() == 14
    assert Subject.objects.count() == 12
    assert ClassLevel.objects.count() == 5
    assert University.objects.count() == 3

    # Check specific required entries
    assert Area.objects.filter(slug="zindabazar", name_bn="জিন্দাবাজার").exists()
    assert Area.objects.filter(slug="amberkhana", name_bn="আম্বরখানা").exists()
    assert Subject.objects.filter(slug="math", name_bn="গণিত").exists()
    assert Subject.objects.filter(slug="ielts", name_bn="আইইএলটিএস").exists()
    assert ClassLevel.objects.filter(slug="ssc").exists()
    assert University.objects.filter(slug="sust", short_name="SUST").exists()


def test_seed_data_is_idempotent():
    # Run seed_data twice and ensure no duplicate records
    call_command("seed_data")
    call_command("seed_data")

    assert Area.objects.count() == 14
    assert Subject.objects.count() == 12
    assert ClassLevel.objects.count() == 5
    assert University.objects.count() == 3
