"""Profile photo → imgBB (public host, photos only). imgBB is mocked: no key, no network."""

import io

import pytest
import requests
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.tutors.models import TutorProfile

pytestmark = pytest.mark.django_db

AVATAR = "/api/v1/auth/me/avatar/"
SECRET_KEY = "super-secret-imgbb-key-123"
IMAGE_URL = "https://i.ibb.co/abc123/photo.jpg"
DELETE_URL = "https://ibb.co/abc123/deadbeefdeadbeef"


def image_bytes(fmt="JPEG", size=(800, 600), color=(30, 120, 200), **kwargs):
    buffer = io.BytesIO()
    Image.new("RGB", size, color).save(buffer, format=fmt, **kwargs)
    return buffer.getvalue()


def put(client, data=None, name="me.jpg", content_type="image/jpeg"):
    payload = image_bytes() if data is None else data
    return client.put(
        AVATAR,
        {"file": SimpleUploadedFile(name, payload, content_type=content_type)},
        format="multipart",
    )


class FakeResponse:
    def __init__(self, payload=None, status=200, bad_json=False):
        self.status_code = status
        self._payload = payload
        self._bad_json = bad_json

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"{self.status_code} for url: https://api.imgbb.com/1/upload")

    def json(self):
        if self._bad_json:
            raise ValueError("not json")
        return self._payload


def ok_payload(url=IMAGE_URL, delete_url=DELETE_URL):
    return {"data": {"url": url, "delete_url": delete_url}, "success": True, "status": 200}


@pytest.fixture
def imgbb(monkeypatch, settings):
    """A working imgBB; `calls` records what we sent. Swap `behaviour` for a failure."""
    settings.IMGBB_API_KEY = SECRET_KEY
    settings.IMGBB_API_URL = "https://api.imgbb.test/1/upload"
    state = {"calls": [], "behaviour": lambda: FakeResponse(ok_payload())}

    def fake_post(url, **kwargs):
        state["calls"].append({"url": url, **kwargs})
        result = state["behaviour"]()
        if isinstance(result, Exception):
            raise result
        return result

    monkeypatch.setattr("apps.accounts.imgbb.requests.post", fake_post)
    return state


def sent_image(state):
    _, content, _ = state["calls"][-1]["files"]["image"]
    return Image.open(io.BytesIO(content))


@pytest.fixture
def user():
    return User.objects.create_user("Rahim Uddin", phone="01712345678", password="x", role="tutor")


@pytest.fixture
def client(user):
    api = APIClient()
    api.force_authenticate(user)
    return api


# --- a good upload -----------------------------------------------------------


def test_upload_saves_the_imgbb_url_and_shows_it_as_avatar(client, user, imgbb):
    response = put(client)

    assert response.status_code == 200
    assert response.json()["avatar"] == IMAGE_URL
    user.refresh_from_db()
    assert user.avatar_url == IMAGE_URL and user.avatar_delete_url == DELETE_URL
    assert client.get("/api/v1/auth/me/").json()["avatar"] == IMAGE_URL


def test_the_delete_link_is_never_sent_to_anyone(client, imgbb):
    put(client)

    for body in (put(client).content, client.get("/api/v1/auth/me/").content):
        assert DELETE_URL.encode() not in body and b"delete_url" not in body


def test_the_key_goes_in_the_post_body_not_the_url(client, imgbb):
    put(client)

    call = imgbb["calls"][0]
    assert call["url"] == "https://api.imgbb.test/1/upload"
    assert SECRET_KEY not in call["url"] and "params" not in call
    assert call["data"]["key"] == SECRET_KEY
    assert call["timeout"] > 0


def test_what_we_send_is_a_small_exif_free_square_jpeg(client, imgbb):
    exif = Image.Exif()
    exif[0x010F] = "SecretPhoneMaker"
    put(client, data=image_bytes(size=(3000, 2000), exif=exif.tobytes()))

    sent = sent_image(imgbb)
    assert sent.format == "JPEG" and sent.size == (512, 512)
    assert len(sent.getexif()) == 0


def test_a_small_photo_is_cropped_square_but_not_enlarged(client, imgbb):
    put(client, data=image_bytes(size=(300, 200)))

    assert sent_image(imgbb).size == (200, 200)


def test_the_file_name_sent_to_imgbb_says_nothing_about_the_user(client, imgbb):
    put(client, name="rahim-uddin-selfie.jpg")

    call = imgbb["calls"][0]
    name = call["files"]["image"][0]
    assert "rahim" not in name and "rahim" not in call["data"]["name"]


@pytest.mark.parametrize("role", ["guardian", "tutor", "admin"])
def test_every_signed_in_role_can_set_a_photo(imgbb, role):
    person = User.objects.create_user("Someone", phone="01799999999", role=role)
    api = APIClient()
    api.force_authenticate(person)

    assert put(api).status_code == 200


def test_uploading_again_replaces_the_photo_and_delete_removes_it(client, user, imgbb):
    put(client)
    imgbb["behaviour"] = lambda: FakeResponse(
        ok_payload("https://i.ibb.co/zzz/new.jpg", "https://ibb.co/zzz/x")
    )
    assert put(client).json()["avatar"] == "https://i.ibb.co/zzz/new.jpg"

    removed = client.delete(AVATAR)

    assert removed.status_code == 200 and removed.json()["avatar"] is None
    user.refresh_from_db()
    assert user.avatar_url == "" and user.avatar_delete_url == ""
    assert client.delete(AVATAR).status_code == 200  # removing nothing is fine


def test_a_user_without_a_photo_has_a_null_avatar(client):
    assert client.get("/api/v1/auth/me/").json()["avatar"] is None


# --- the tutor card shows it ---------------------------------------------------


def test_the_search_card_uses_the_photo_and_hides_the_delete_link(client, user, imgbb):
    put(client)
    TutorProfile.objects.create(user=user, verification_status="approved")
    other = User.objects.create_user("No Photo", phone="01733333333", role="tutor")
    TutorProfile.objects.create(user=other, verification_status="approved")

    page = APIClient().get("/api/v1/tutors/")
    cards = {c["name"]: c for c in page.json()["results"]}

    assert cards["Rahim Uddin"]["avatarUrl"] == IMAGE_URL
    assert cards["No Photo"]["avatarUrl"] is None
    assert b"delete_url" not in page.content and DELETE_URL.encode() not in page.content


# --- when imgBB is down, refuses, or is not set up -------------------------------


def test_without_a_key_the_endpoint_says_uploads_are_unavailable(client, settings, imgbb):
    settings.IMGBB_API_KEY = ""

    response = put(client)

    assert response.status_code == 503 and response.json()["code"] == "uploads_unavailable"
    assert imgbb["calls"] == []


@pytest.mark.parametrize(
    "behaviour",
    [
        lambda: requests.Timeout("slow"),
        lambda: requests.ConnectionError("down"),
        lambda: FakeResponse(status=400),
        lambda: FakeResponse(status=500),
        lambda: FakeResponse(bad_json=True),
        lambda: FakeResponse({"success": True}),
        lambda: FakeResponse({"data": {"url": IMAGE_URL}, "success": False}),
        lambda: FakeResponse({"data": {"url": IMAGE_URL}}),
        lambda: FakeResponse(ok_payload(url="http://i.ibb.co/insecure.jpg")),
        lambda: FakeResponse(ok_payload(url="javascript:alert(1)")),
        lambda: FakeResponse(ok_payload(url=None)),
        lambda: FakeResponse(["not", "a", "dict"]),
    ],
    ids=[
        "timeout", "connection", "http-400", "http-500", "bad-json", "no-data", "success-false",
        "no-success-flag", "http-url", "js-url", "null-url", "not-a-dict",
    ],
)  # fmt: skip
def test_any_imgbb_problem_is_a_clean_502_and_keeps_the_old_photo(client, user, imgbb, behaviour):
    user.avatar_url = "https://i.ibb.co/old/old.jpg"
    user.save()
    imgbb["behaviour"] = behaviour

    response = put(client)

    assert response.status_code == 502 and response.json()["code"] == "upload_failed"
    assert SECRET_KEY not in response.content.decode()
    user.refresh_from_db()
    assert user.avatar_url == "https://i.ibb.co/old/old.jpg"


# --- bad files never reach imgBB ---------------------------------------------------


@pytest.mark.parametrize(
    ("data", "name", "type_", "code"),
    [
        (b"plain text", "me.jpg", "image/jpeg", "not_an_image"),
        (b"%PDF-1.4 fake", "me.pdf", "application/pdf", "not_an_image"),
        (image_bytes("GIF"), "me.gif", "image/gif", "unsupported_format"),
        (b"\xff\xd8\xff" + b"x" * (5 * 1024 * 1024), "me.jpg", "image/jpeg", "file_too_large"),
    ],
)
def test_a_bad_file_is_refused_before_anything_is_sent(client, imgbb, data, name, type_, code):
    response = put(client, data=data, name=name, content_type=type_)

    assert response.status_code == 400
    assert response.json()["fields"]["file"][0]["code"] == code
    assert imgbb["calls"] == []


def test_a_request_without_a_file_is_refused(client, imgbb):
    response = client.put(AVATAR, {}, format="multipart")

    assert response.status_code == 400
    assert response.json()["fields"]["file"][0]["code"] == "required"


# --- access and limits ---------------------------------------------------------------


def test_anonymous_gets_401(imgbb):
    assert put(APIClient()).status_code == 401
    assert APIClient().delete(AVATAR).status_code == 401
    assert imgbb["calls"] == []


def test_the_sixth_upload_within_a_minute_is_throttled(client, imgbb):
    cache.clear()
    for _ in range(5):
        assert put(client).status_code == 200

    response = put(client)

    assert response.status_code == 429 and response.json()["code"] == "throttled"
