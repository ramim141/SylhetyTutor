"""Requirements: who may call what, limits, the contact-info filter, matching and privacy."""

import json
from datetime import timedelta

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.guardians.models import GuardianProfile, Requirement
from apps.lookups.models import Area, ClassLevel, Subject
from apps.tutors.models import TutorProfile

pytestmark = pytest.mark.django_db

PASSWORD = "Sylhet-Strong-2026!"
LIST = "/api/v1/requirements/"
MATCHING = "/api/v1/requirements/matching/"


def make_user(role, phone, name="Test User"):
    return User.objects.create_user(name, phone=phone, password=PASSWORD, role=role)


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def lookups():
    areas = {
        s: Area.objects.create(name_en=s.title(), name_bn=s, slug=s)
        for s in ("amberkhana", "zindabazar", "subid-bazar")
    }
    classes = {
        s: ClassLevel.objects.create(name_en=s.upper(), name_bn=s, slug=s) for s in ("hsc", "ssc")
    }
    subjects = {
        s: Subject.objects.create(name_en=s.title(), name_bn=s, slug=s)
        for s in ("math", "physics", "english")
    }
    return areas, classes, subjects


@pytest.fixture
def guardian():
    user = make_user("guardian", "01711111111")
    return client_for(user), user


def payload(**extra):
    data = {
        "class_level": "hsc",
        "area": "amberkhana",
        "subjects": ["math", "physics"],
        "budget_min": 3000,
        "budget_max": 5000,
        "preferred_gender": "any",
        "schedule_note": "Sun, Tue, Thu evening",
    }
    data.update(extra)
    return data


def post_open(client, **extra):
    created = client.post(LIST, payload(**extra), format="json")
    assert created.status_code == 201, created.json()
    published = client.post(f"{LIST}{created.json()['id']}/publish/")
    assert published.status_code == 200, published.json()
    return published.json()


def approved_tutor(phone="01722222222", gender="female", fee=(2000, 4000), **teaches):
    user = make_user("tutor", phone)
    profile, _ = TutorProfile.objects.get_or_create(user=user)
    profile.gender = gender
    profile.fee_min, profile.fee_max = fee
    profile.verification_status = "approved"
    profile.save()
    profile.areas.set(Area.objects.filter(slug__in=teaches.get("areas", ["amberkhana"])))
    profile.class_levels.set(ClassLevel.objects.filter(slug__in=teaches.get("classes", ["hsc"])))
    profile.subjects.set(Subject.objects.filter(slug__in=teaches.get("subjects", ["math"])))
    return client_for(user), profile


# --- the guardian profile ----------------------------------------------------------------------


def test_every_guardian_gets_a_profile_and_a_tutor_does_not():
    guardian = make_user("guardian", "01733333333")
    tutor = make_user("tutor", "01744444444")
    assert GuardianProfile.objects.filter(user=guardian).exists()
    assert not GuardianProfile.objects.filter(user=tutor).exists()


def test_guardian_me_shows_limits(guardian):
    client, _ = guardian
    body = client.get("/api/v1/guardians/me/").json()
    assert body["max_open"] == 3 and body["max_drafts"] == 5
    assert body["open_count"] == 0 and body["draft_count"] == 0
    assert "phone" not in body


# --- who may call it ---------------------------------------------------------------------------


def test_guest_gets_401(lookups):
    client = APIClient()
    for response in (
        client.get(LIST),
        client.post(LIST, {}),
        client.get(MATCHING),
        client.get("/api/v1/guardians/me/"),
    ):
        assert response.status_code == 401


def test_tutor_cannot_use_guardian_endpoints(lookups):
    client = client_for(make_user("tutor", "01755555555"))
    assert client.get(LIST).status_code == 403
    assert client.post(LIST, payload(), format="json").status_code == 403


def test_admin_can_use_guardian_endpoints(lookups):
    client = client_for(make_user("admin", "01766666666"))
    assert client.get(LIST).status_code == 200
    res = client.post(LIST, payload(), format="json")
    assert res.status_code == 201


def test_guardian_cannot_see_matching(lookups, guardian):
    client, _ = guardian
    assert client.get(MATCHING).status_code == 403


@pytest.mark.parametrize("state", ["draft", "pending", "rejected"])
def test_a_tutor_who_is_not_approved_gets_403_on_matching(lookups, state):
    _, profile = approved_tutor()
    TutorProfile.objects.filter(pk=profile.pk).update(verification_status=state)
    # a fresh user object: the old one still has the approved profile cached
    client = client_for(User.objects.get(pk=profile.user_id))
    assert client.get(MATCHING).status_code == 403


def test_someone_elses_requirement_is_404(lookups, guardian):
    client, _ = guardian
    mine = post_open(client)
    other = client_for(make_user("guardian", "01788888888"))
    url = f"{LIST}{mine['id']}/"
    assert other.get(url).status_code == 404
    assert other.patch(url, {"budget_max": 9000}, format="json").status_code == 404
    assert other.delete(url).status_code == 404
    assert other.post(url + "publish/").status_code == 404
    assert other.post(url + "close/").status_code == 404
    assert other.get(LIST).json() == []


# --- draft, publish, close ---------------------------------------------------------------------


def test_draft_is_not_visible_to_tutors_until_published(lookups, guardian):
    client, _ = guardian
    tutor, _ = approved_tutor()
    created = client.post(LIST, payload(), format="json").json()
    assert created["status"] == "draft"
    assert tutor.get(MATCHING).json()["results"] == []
    client.post(f"{LIST}{created['id']}/publish/")
    assert [r["id"] for r in tutor.get(MATCHING).json()["results"]] == [created["id"]]


def test_a_draft_can_be_saved_half_filled_but_not_published(lookups, guardian):
    client, _ = guardian
    created = client.post(LIST, {"area": "amberkhana"}, format="json").json()
    assert created["missing"] == ["class_level", "subjects"]
    response = client.post(f"{LIST}{created['id']}/publish/")
    assert response.status_code == 400
    assert response.json()["fields"].keys() == {"class_level", "subjects"}


def test_edit_draft_but_not_an_open_requirement(lookups, guardian):
    client, _ = guardian
    created = client.post(LIST, payload(), format="json").json()
    url = f"{LIST}{created['id']}/"
    assert client.patch(url, {"budget_max": 6000}, format="json").json()["budget_max"] == 6000
    client.post(url + "publish/")
    response = client.patch(url, {"budget_max": 7000}, format="json")
    assert response.status_code == 409 and response.json()["code"] == "not_draft"


def test_delete_rules(lookups, guardian):
    client, _ = guardian
    draft = client.post(LIST, payload(), format="json").json()
    assert client.delete(f"{LIST}{draft['id']}/").status_code == 204
    live = post_open(client)
    response = client.delete(f"{LIST}{live['id']}/")
    assert response.status_code == 409 and response.json()["code"] == "use_close"
    client.post(f"{LIST}{live['id']}/close/")
    response = client.delete(f"{LIST}{live['id']}/")
    assert response.status_code == 409 and response.json()["code"] == "not_draft"


def test_close_then_republish(lookups, guardian):
    client, _ = guardian
    live = post_open(client)
    url = f"{LIST}{live['id']}/"
    closed = client.post(url + "close/", {"reason": "found_tutor"}, format="json").json()
    assert closed["status"] == "closed" and closed["close_reason"] == "found_tutor"
    again = client.post(url + "close/")
    assert again.status_code == 409 and again.json()["code"] == "not_open"
    reopened = client.post(url + "publish/").json()
    assert reopened["status"] == "open" and reopened["close_reason"] == ""


def test_unknown_close_reason_is_refused(lookups, guardian):
    client, _ = guardian
    live = post_open(client)
    response = client.post(f"{LIST}{live['id']}/close/", {"reason": "bored"}, format="json")
    assert response.status_code == 400


def test_publishing_twice_is_refused(lookups, guardian):
    client, _ = guardian
    live = post_open(client)
    response = client.post(f"{LIST}{live['id']}/publish/")
    assert response.status_code == 409 and response.json()["code"] == "already_open"


# --- limits ------------------------------------------------------------------------------------


def test_at_most_three_open_requirements(lookups, guardian):
    client, _ = guardian
    for _ in range(3):
        post_open(client)
    fourth = client.post(LIST, payload(), format="json").json()
    response = client.post(f"{LIST}{fourth['id']}/publish/")
    assert response.status_code == 409 and response.json()["code"] == "too_many_open"


def test_closing_one_frees_a_slot(lookups, guardian):
    client, _ = guardian
    first = post_open(client)
    post_open(client)
    post_open(client)
    client.post(f"{LIST}{first['id']}/close/")
    post_open(client)


def test_an_expired_requirement_does_not_count_and_can_be_republished(lookups, guardian):
    client, _ = guardian
    old = post_open(client)
    Requirement.objects.filter(pk=old["id"]).update(
        published_at=timezone.now() - timedelta(days=31)
    )
    mine = client.get(f"{LIST}{old['id']}/").json()
    assert mine["expired"] is True
    for _ in range(3):
        post_open(client)
    assert client.post(f"{LIST}{old['id']}/publish/").json()["code"] == "too_many_open"


def test_at_most_five_drafts(lookups, guardian, settings):
    settings.REST_FRAMEWORK = {
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_RATES": {
            **settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"],
            "requirement_create": "100/hour",
        },
    }
    client, _ = guardian
    for _ in range(5):
        assert client.post(LIST, {}, format="json").status_code == 201
    response = client.post(LIST, {}, format="json")
    assert response.status_code == 409 and response.json()["code"] == "too_many_drafts"


def test_creating_is_throttled_per_account(lookups, guardian):
    client, _ = guardian
    codes = []
    for _ in range(12):
        response = client.post(LIST, {}, format="json")
        codes.append(response.status_code)
        if response.status_code == 409:
            client.delete(f"{LIST}{Requirement.objects.first().pk}/")
    assert 429 in codes


# --- validation --------------------------------------------------------------------------------


@pytest.mark.parametrize(
    "note",
    [
        "call 01712345678",
        "call 0171 234 5678",
        "ফোন ০১৭১২৩৪৫৬৭৮",
        "০১৭১২-৩৪৫৬৭৮ এ ফোন দিন",
        "+880 1712 345678",
        "mail me at a@b.com",
        "see www.example.com",
        "http://x.y",
        "find me on WhatsApp",
        "add me on imo",
        "ফেসবুকে মেসেজ দিন",
        "হোয়াটসঅ্যাপ করুন",
    ],
)
def test_contact_details_in_the_note_are_refused(lookups, guardian, note):
    client, _ = guardian
    response = client.post(LIST, payload(schedule_note=note), format="json")
    assert response.status_code == 400
    assert response.json()["fields"]["schedule_note"][0]["code"] == "contact_not_allowed"


@pytest.mark.parametrize(
    "note", ["Sun, Tue, Thu 5-7 pm", "সন্ধ্যায় সপ্তাহে ৩ দিন", "Class 10, 2 days a week", ""]
)
def test_ordinary_notes_pass(lookups, guardian, note):
    client, _ = guardian
    assert client.post(LIST, payload(schedule_note=note), format="json").status_code == 201


def test_budget_rules(lookups, guardian):
    client, _ = guardian
    assert (
        client.post(LIST, payload(budget_min=6000, budget_max=3000), format="json").status_code
        == 400
    )
    assert client.post(LIST, payload(budget_min=10), format="json").status_code == 400
    assert client.post(LIST, payload(budget_max=900000), format="json").status_code == 400
    assert (
        client.post(LIST, payload(budget_min=None, budget_max=None), format="json").status_code
        == 201
    )


def test_unknown_lookups_are_refused(lookups, guardian):
    client, _ = guardian
    assert client.post(LIST, payload(area="mars"), format="json").status_code == 400
    assert client.post(LIST, payload(subjects=["math", "nope"]), format="json").status_code == 400


# --- matching ----------------------------------------------------------------------------------


def listed(client):
    return [r["id"] for r in client.get(MATCHING).json()["results"]]


def test_matching_rules_each_exclusion(lookups, guardian):
    g, _ = guardian
    tutor, profile = approved_tutor()
    want = post_open(g)["id"]
    assert listed(tutor) == [want]

    # wrong area, wrong class, no shared subject, wrong gender: each one drops the requirement
    for field, value in (
        ("area", "zindabazar"),
        ("class_level", "ssc"),
        ("subjects", ["english"]),
        ("preferred_gender", "male"),
    ):
        Requirement.objects.all().delete()
        post_open(g, **{field: value})
        assert listed(tutor) == [], field


def test_one_shared_subject_is_enough_and_there_are_no_duplicates(lookups, guardian):
    g, _ = guardian
    tutor, _ = approved_tutor(subjects=["math", "physics"])
    post_open(g, subjects=["math", "physics", "english"])
    assert len(listed(tutor)) == 1


def test_gender_preference_matches_the_tutor_gender(lookups, guardian):
    g, _ = guardian
    post_open(g, preferred_gender="female")
    woman, _ = approved_tutor(phone="01722222221", gender="female")
    man, _ = approved_tutor(phone="01722222222", gender="male")
    assert len(listed(woman)) == 1
    assert listed(man) == []


def test_closed_and_expired_requirements_do_not_match(lookups, guardian):
    g, _ = guardian
    tutor, _ = approved_tutor()
    closed = post_open(g)
    g.post(f"{LIST}{closed['id']}/close/")
    old = post_open(g)
    Requirement.objects.filter(pk=old["id"]).update(
        published_at=timezone.now() - timedelta(days=31)
    )
    assert listed(tutor) == []


def test_budget_fits_is_a_flag_not_a_filter(lookups, guardian):
    g, _ = guardian
    post_open(g, budget_min=1000, budget_max=1500)
    cheap, _ = approved_tutor(phone="01722222221", fee=(1000, 2000))
    pricey, _ = approved_tutor(phone="01722222222", fee=(5000, 8000))
    assert cheap.get(MATCHING).json()["results"][0]["budget_fits"] is True
    assert pricey.get(MATCHING).json()["results"][0]["budget_fits"] is False


def test_matching_detail_only_for_a_match(lookups, guardian):
    g, _ = guardian
    tutor, _ = approved_tutor()
    mine = post_open(g)
    other = post_open(g, area="zindabazar")
    assert tutor.get(f"{MATCHING}{mine['id']}/").status_code == 200
    assert tutor.get(f"{MATCHING}{other['id']}/").status_code == 404


def test_tutor_response_has_no_guardian_or_contact_data(lookups, guardian):
    g, user = guardian
    tutor, _ = approved_tutor()
    post_open(g)
    raw = json.dumps(
        [tutor.get(MATCHING).json(), tutor.get(f"{MATCHING}{listed(tutor)[0]}/").json()]
    )
    for secret in (user.phone, user.full_name, "guardian", "phone", "email", "address", "user"):
        assert secret not in raw, secret
    assert set(tutor.get(MATCHING).json()["results"][0]) == {
        "id",
        "class_level",
        "area",
        "subjects",
        "budget_min",
        "budget_max",
        "preferred_gender",
        "schedule_note",
        "published_at",
        "budget_fits",
        "application_status",
    }


def test_matching_list_uses_a_fixed_number_of_queries(lookups, guardian):
    g, _ = guardian
    tutor, _ = approved_tutor(subjects=["math", "physics"])
    for _ in range(3):
        post_open(g)
    with CaptureQueriesContext(connection) as small:
        tutor.get(MATCHING)
    Requirement.objects.bulk_create(
        [
            Requirement(
                guardian=Requirement.objects.first().guardian,
                class_level=ClassLevel.objects.get(slug="hsc"),
                area=Area.objects.get(slug="amberkhana"),
                status="open",
                published_at=timezone.now(),
            )
            for _ in range(10)
        ]
    )
    for requirement in Requirement.objects.filter(subjects__isnull=True):
        requirement.subjects.set(Subject.objects.filter(slug="math"))
    with CaptureQueriesContext(connection) as large:
        body = tutor.get(MATCHING).json()
    assert len(body["results"]) == 13
    assert len(large) <= len(small) + 1
