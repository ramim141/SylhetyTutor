import io

from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

ME = "/api/v1/tutors/me/"


def image_bytes(fmt="JPEG", size=(300, 200), color=(200, 30, 30), mode="RGB", **save_kwargs):
    buffer = io.BytesIO()
    Image.new(mode, size, color).save(buffer, format=fmt, **save_kwargs)
    return buffer.getvalue()


def upload(client, kind, data=None, name="scan.jpg", content_type="image/jpeg"):
    """PUT one document the way the browser does: multipart with a `file` part."""
    payload = image_bytes() if data is None else data
    return client.put(
        f"{ME}documents/{kind}/",
        {"file": SimpleUploadedFile(name, payload, content_type=content_type)},
        format="multipart",
    )


def upload_both(client):
    assert upload(client, "nid").status_code == 200
    assert upload(client, "student_id").status_code == 200
