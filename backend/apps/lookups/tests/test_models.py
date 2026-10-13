import pytest

from apps.lookups.models import Area, ClassLevel, Subject, University

pytestmark = pytest.mark.django_db


def test_create_area():
    area = Area.objects.create(
        name_en="Zindabazar",
        name_bn="জিন্দাবাজার",
        slug="zindabazar",
        sort_order=1,
    )
    assert area.id is not None
    assert str(area) == "Zindabazar (জিন্দাবাজার)"
    assert area.is_active is True


def test_create_subject():
    subject = Subject.objects.create(
        name_en="Physics",
        name_bn="পদার্থবিজ্ঞান",
        slug="physics",
        sort_order=2,
    )
    assert subject.id is not None
    assert str(subject) == "Physics (পদার্থবিজ্ঞান)"


def test_create_class_level():
    level = ClassLevel.objects.create(
        name_en="HSC (Class 11–12)",
        name_bn="এইচএসসি (১১শ–১২শ)",
        slug="hsc",
        sort_order=4,
    )
    assert level.id is not None
    assert str(level) == "HSC (Class 11–12) (এইচএসসি (১১শ–১২শ))"


def test_create_university():
    uni = University.objects.create(
        name_en="Shahjalal University of Science and Technology",
        name_bn="শাহজালাল বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয়",
        short_name="SUST",
        slug="sust",
        sort_order=1,
    )
    assert uni.id is not None
    assert "SUST" in str(uni)
