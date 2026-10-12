"""NID / student-ID upload: validation, privacy, who can read what."""

import io
from pathlib import Path

import pytest
from django.conf import settings as django_settings
from django.core.cache import cache
from django.test import Client
from django.urls import reverse
from PIL import Image
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.tutors.documents import MAX_SIDE, private_storage
from apps.tutors.models import TutorProfile

from .helpers import ME, image_bytes, upload, upload_both

pytestmark = pytest.mark.django_db

PASSWORD = "Sylhet-Strong-2026!"


def make_user(role="tutor", phone="01712345678", **extra):
    return User.objects.create_user(
        "Nusrat Jahan", phone=phone, password=PASSWORD, role=role, **extra
    )


def client_for(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def tutor():
    user = make_user()
    return client_for(user), user


def stored_files():
    root = Path(django_settings.PRIVATE_MEDIA_ROOT)
    return sorted(p for p in root.rglob("*") if p.is_file()) if root.exists() else []


def stored_image(profile, field="nid_photo"):
    profile.refresh_from_db()
    with getattr(profile, field).open("rb") as handle:
        return Image.open(io.BytesIO(handle.read()))


def exif_jpeg(orientation=None, size=(300, 200)):
    exif = Image.Exif()
    exif[0x010F] = "SecretPhoneMaker"  # Make
    exif[0x0132] = "2026:10:12 10:00:00"  # DateTime
    if orientation:
        exif[0x0112] = orientation
    return image_bytes("JPEG", size=size, exif=exif.tobytes())


# --- a good upload ---------------------------------------------------------


def test_upload_stores_a_jpeg_privately_and_reports_it(tutor):
    client, user = tutor

    response = upload(client, "nid")

    assert response.status_code == 200
    data = response.json()
    assert data["documents"] == {"nid": True, "student_id": False}
    assert "nid_photo" not in data["missing"] and "student_id_photo" in data["missing"]
    profile = TutorProfile.objects.get(user=user)
    assert stored_image(profile).format == "JPEG"
    (path,) = stored_files()
    assert Path(django_settings.PRIVATE_MEDIA_ROOT) in path.parents
    assert Path(django_settings.MEDIA_ROOT) not in path.parents


def test_the_response_never_contains_a_path_or_url(tutor):
    client, _ = tutor
    upload(client, "nid")

    body = client.get(ME).content.decode()

    assert "private_media" not in body and ".jpg" not in body and "/media/" not in body


def test_the_stored_file_name_says_nothing(tutor):
    client, _ = tutor
    upload(client, "nid", name="rahim-nid-front.jpg")

    (path,) = stored_files()
    assert "rahim" not in path.name and "nid" not in path.name
    assert path.suffix == ".jpg"


@pytest.mark.parametrize("fmt", ["JPEG", "PNG", "WEBP"])
def test_jpeg_png_and_webp_are_accepted(tutor, fmt):
    client, user = tutor

    response = upload(
        client, "student_id", data=image_bytes(fmt), content_type=f"image/{fmt.lower()}"
    )

    assert response.status_code == 200
    assert stored_image(TutorProfile.objects.get(user=user), "student_id_photo").format == "JPEG"


def test_a_transparent_png_is_flattened_onto_white(tutor):
    client, user = tutor
    data = image_bytes("PNG", mode="RGBA", color=(255, 0, 0, 0))

    upload(client, "nid", data=data, content_type="image/png")

    pixel = stored_image(TutorProfile.objects.get(user=user)).getpixel((5, 5))
    assert all(channel > 240 for channel in pixel)


def test_exif_such_as_gps_and_camera_details_is_removed(tutor):
    client, user = tutor
    original = Image.open(io.BytesIO(exif_jpeg()))
    assert original.getexif().get(0x010F) == "SecretPhoneMaker"  # the test file really has it

    upload(client, "nid", data=exif_jpeg())

    assert len(stored_image(TutorProfile.objects.get(user=user)).getexif()) == 0


def test_a_sideways_phone_photo_is_turned_upright_before_exif_is_dropped(tutor):
    client, user = tutor

    upload(client, "nid", data=exif_jpeg(orientation=6, size=(300, 200)))

    assert stored_image(TutorProfile.objects.get(user=user)).size == (200, 300)


def test_a_huge_photo_is_scaled_down(tutor):
    client, user = tutor

    upload(client, "nid", data=image_bytes("JPEG", size=(4000, 3000)))

    assert max(stored_image(TutorProfile.objects.get(user=user)).size) == MAX_SIDE


def test_uploading_again_replaces_the_file_on_disk(tutor):
    client, _ = tutor
    upload(client, "nid", data=image_bytes(color=(10, 10, 10)))
    (first,) = stored_files()

    upload(client, "nid", data=image_bytes(color=(250, 250, 250)))

    (second,) = stored_files()
    assert second != first and not first.exists()


# --- a bad upload ----------------------------------------------------------


def rejected(client, data, code, name="scan.jpg", content_type="image/jpeg", kind="nid"):
    response = upload(client, kind, data=data, name=name, content_type=content_type)
    assert response.status_code == 400, response.content
    assert response.json()["fields"]["file"][0]["code"] == code
    assert stored_files() == []


def test_a_text_file_renamed_to_jpg_is_not_an_image(tutor):
    rejected(tutor[0], b"just some text, not a picture", "not_an_image")


def test_a_pdf_is_not_accepted(tutor):
    rejected(
        tutor[0],
        b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\n",
        "not_an_image",
        "scan.pdf",
        "application/pdf",
    )


def test_an_svg_with_a_script_is_not_accepted(tutor):
    svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    rejected(tutor[0], svg, "not_an_image", "scan.svg", "image/svg+xml")


def test_a_gif_is_a_real_image_but_not_an_allowed_format(tutor):
    rejected(tutor[0], image_bytes("GIF"), "unsupported_format", "scan.gif", "image/gif")


def test_a_truncated_image_is_rejected(tutor):
    rejected(tutor[0], image_bytes("PNG")[:60], "not_an_image", "scan.png", "image/png")


def test_more_than_five_megabytes_is_refused_before_it_is_decoded(tutor):
    rejected(tutor[0], b"\xff\xd8\xff" + b"x" * (5 * 1024 * 1024), "file_too_large")


def test_an_image_with_too_many_pixels_is_refused(tutor):
    bomb = image_bytes("PNG", size=(8000, 6000), mode="L", color=0)  # ~48 million pixels, tiny file
    rejected(tutor[0], bomb, "image_too_large", "scan.png", "image/png")


def test_a_request_without_a_file_is_refused(tutor):
    client, _ = tutor

    response = client.put(f"{ME}documents/nid/", {}, format="multipart")

    assert response.status_code == 400
    assert response.json()["fields"]["file"][0]["code"] == "required"


def test_an_unknown_document_kind_is_404(tutor):
    assert upload(tutor[0], "passport").status_code == 404
    assert tutor[0].delete(f"{ME}documents/passport/").status_code == 404


# --- who may upload, and when ----------------------------------------------


def test_only_signed_in_tutors_can_upload():
    assert upload(APIClient(), "nid").status_code == 401
    for role, phone in (("guardian", "01733333333"), ("admin", "01744444444")):
        assert upload(client_for(make_user(role, phone)), "nid").status_code == 403


def test_documents_are_locked_while_pending_and_after_approval(tutor):
    client, user = tutor
    upload_both(client)
    profile = TutorProfile.objects.get(user=user)

    profile.verification_status = "pending"
    profile.save()
    locked = upload(client, "nid")
    assert locked.status_code == 409 and locked.json()["code"] == "profile_locked"
    assert client.delete(f"{ME}documents/nid/").status_code == 409

    cache.clear()  # the throttle counts refused requests too; that is not what this test is about
    profile.verification_status = "approved"
    profile.save()
    approved = upload(client, "nid")
    assert approved.status_code == 400
    assert approved.json()["fields"]["file"][0]["code"] == "locked"
    assert client.delete(f"{ME}documents/nid/").status_code == 400
    assert len(stored_files()) == 2


def test_a_rejected_tutor_can_replace_an_unreadable_scan(tutor):
    client, user = tutor
    upload_both(client)
    TutorProfile.objects.filter(user=user).update(
        verification_status="rejected", rejection_reason="Student ID is blurry"
    )

    assert upload(client, "student_id").status_code == 200


def test_the_sixth_upload_within_a_minute_is_throttled(tutor):
    client, _ = tutor
    for _ in range(5):
        assert upload(client, "nid").status_code == 200

    response = upload(client, "nid")

    assert response.status_code == 429 and response.json()["code"] == "throttled"


def test_a_tutor_can_remove_their_own_document(tutor):
    client, user = tutor
    upload_both(client)

    response = client.delete(f"{ME}documents/nid/")

    assert response.status_code == 200
    assert response.json()["documents"] == {"nid": False, "student_id": True}
    assert len(stored_files()) == 1
    assert "nid_photo" in response.json()["missing"]


def test_submit_needs_both_documents(tutor):
    client, _ = tutor
    complete = {
        "gender": "female", "university": None, "department": "Physics", "year": "3rd Year",
        "student_id_number": "2021331001", "fee_min": 4000, "fee_max": 6000,
    }  # fmt: skip
    client.patch(ME, complete)

    fields = client.post(f"{ME}submit/").json()["fields"]

    assert {"nid_photo", "student_id_photo"} <= set(fields)


# --- reading a document ----------------------------------------------------


def download(client, profile, kind="nid"):
    return client.get(reverse("tutors:document", args=[profile.pk, kind]))


@pytest.fixture
def uploaded(tutor):
    client, user = tutor
    upload_both(client)
    return client, user, TutorProfile.objects.get(user=user)


def test_the_owner_can_read_their_document_with_safe_headers(uploaded):
    client, _, profile = uploaded

    response = download(client, profile)

    assert response.status_code == 200
    assert response["Content-Type"] == "image/jpeg"
    assert response["Cache-Control"] == "private, no-store"
    assert response["X-Content-Type-Options"] == "nosniff"
    assert Image.open(io.BytesIO(b"".join(response.streaming_content))).format == "JPEG"


def test_an_admin_can_read_any_document(uploaded):
    _, _, profile = uploaded
    admin = client_for(make_user("admin", "01755555555"))
    staff = client_for(make_user("guardian", "01766666666", is_staff=True))

    assert download(admin, profile).status_code == 200
    assert download(staff, profile, "student_id").status_code == 200


def test_nobody_else_can_read_it_and_the_answer_hides_that_it_exists(uploaded):
    _, _, profile = uploaded
    other_tutor = client_for(make_user("tutor", "01777777777"))
    guardian = client_for(make_user("guardian", "01788888888"))
    nobody = reverse("tutors:document", args=["00000000-0000-0000-0000-000000000000", "nid"])

    for stranger in (other_tutor, guardian):
        denied = download(stranger, profile)
        assert denied.status_code == 404
        assert denied.json() == stranger.get(nobody).json()  # same as "no such profile"


def test_anonymous_gets_401(uploaded):
    _, _, profile = uploaded
    assert download(APIClient(), profile).status_code == 401


def test_a_missing_document_or_unknown_kind_is_404(tutor):
    client, user = tutor
    profile = TutorProfile.objects.create(user=user)

    assert download(client, profile, "nid").status_code == 404
    assert download(client, profile, "passport").status_code == 404


def test_the_media_url_does_not_serve_private_files(uploaded):
    _, _, profile = uploaded
    name = profile.nid_photo.name

    assert Client().get(f"/media/{name}").status_code == 404
    assert Client().get(f"/{name}").status_code == 404


# --- storage and cleanup ---------------------------------------------------


def test_private_storage_refuses_to_make_a_url(uploaded):
    _, _, profile = uploaded
    with pytest.raises(ValueError, match="no public URL"):
        _ = profile.nid_photo.url
    with pytest.raises(ValueError, match="no public URL"):
        private_storage.url("anything")


def test_deleting_a_profile_deletes_its_scans_from_disk(uploaded):
    _, user, profile = uploaded
    assert len(stored_files()) == 2

    user.delete()

    assert stored_files() == []


# --- Django admin ----------------------------------------------------------


def test_admin_page_links_to_the_scans_and_a_staff_session_can_open_them(uploaded):
    _, _, profile = uploaded
    boss = User.objects.create_superuser("Boss", phone="01799999999", password=PASSWORD)
    browser = Client()
    browser.force_login(boss)

    page = browser.get(reverse("admin:tutors_tutorprofile_change", args=[profile.pk]))

    assert page.status_code == 200
    link = reverse("admin:tutors_tutorprofile_document", args=[profile.pk, "nid"])
    assert link in page.content.decode()
    scan = browser.get(link)
    assert scan.status_code == 200 and "no-store" in scan["Cache-Control"]


def test_the_admin_scan_link_needs_a_staff_login(uploaded):
    _, _, profile = uploaded
    link = reverse("admin:tutors_tutorprofile_document", args=[profile.pk, "nid"])

    anonymous = Client().get(link)
    assert anonymous.status_code == 302 and "login" in anonymous["Location"]

    member = Client()
    member.force_login(make_user("tutor", "01700000001"))
    assert member.get(link).status_code == 302


def test_the_admin_form_cannot_approve_a_profile_without_its_scans(tutor):
    from django.core.exceptions import ValidationError

    _, user = tutor
    profile = TutorProfile.objects.create(
        user=user,
        verification_status="approved",
        gender="male",
        department="CSE",
        year="2nd Year",
        student_id_number="1",
        fee_min=3000,
        fee_max=5000,
    )

    with pytest.raises(ValidationError, match="nid_photo"):
        profile.full_clean()
