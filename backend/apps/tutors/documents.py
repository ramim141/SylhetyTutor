"""
NID and student-ID scans — the most sensitive data on the platform.

Rules this module enforces (Sprint Plan, Sprint 3; Architecture Doc §3.2, §8):
- stored outside MEDIA_ROOT in PRIVATE_MEDIA_ROOT and never given a URL;
- only the owner and admins can read a file (apps/tutors/views.py);
- an upload must really be an image (checked by decoding it, not by trusting the file
  name or the Content-Type header), at most 5 MB;
- the stored copy is re-encoded: EXIF (which can carry GPS position) is dropped and
  anything hidden in the file is discarded;
- file names are random, so nothing about the tutor or the document type leaks.
"""

import io
import uuid
import warnings

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import FileSystemStorage
from django.http import FileResponse, Http404
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework import serializers
from rest_framework.exceptions import ErrorDetail

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_PIXELS = 40_000_000  # refuses "decompression bombs" before they are decoded
MAX_SIDE = 2000  # long side of the stored copy; plenty to read a card, bounded storage
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}

# URL kind -> TutorProfile field
DOCUMENT_FIELDS = {"nid": "nid_photo", "student_id": "student_id_photo"}


class PrivateDocumentStorage(FileSystemStorage):
    """Files under PRIVATE_MEDIA_ROOT (read at use time, so tests can point it at a temp dir)."""

    @property
    def base_location(self):
        return str(settings.PRIVATE_MEDIA_ROOT)

    @property
    def location(self):
        return self.base_location

    def url(self, name):
        raise ValueError("Private documents have no public URL; stream them through the API.")


private_storage = PrivateDocumentStorage()


def document_upload_to(profile, filename):
    return f"documents/{profile.pk}/{uuid.uuid4().hex}.jpg"


def _error(code, message):
    return serializers.ValidationError({"file": [ErrorDetail(message, code=code)]})


def _decode(uploaded):
    """Open an upload as an upright, fully loaded image, or raise a field error."""
    Image.MAX_IMAGE_PIXELS = MAX_PIXELS
    try:
        with Image.open(uploaded) as probe:
            fmt = probe.format
            width, height = probe.size
            if width * height > MAX_PIXELS:  # Pillow itself only warns until 2x this
                raise _error("image_too_large", "The image has too many pixels.")
            probe.verify()  # cheap structural check
        uploaded.seek(0)
        with Image.open(uploaded) as image:
            if fmt not in ALLOWED_FORMATS:
                raise _error("unsupported_format", "Use a JPEG, PNG or WebP photo.")
            image = ImageOps.exif_transpose(image)  # honour phone rotation, then drop EXIF
            image.load()
            return image
    except serializers.ValidationError:
        raise
    except Image.DecompressionBombError:
        raise _error("image_too_large", "The image has too many pixels.") from None
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError):
        raise _error("not_an_image", "This file is not a readable image.") from None


def clean_document_image(uploaded):
    """Validate an upload and return a clean JPEG copy as a ContentFile."""
    if uploaded is None:
        raise _error("required", "No file was submitted.")
    if uploaded.size > MAX_UPLOAD_BYTES:
        raise _error("file_too_large", "The file is larger than 5 MB.")

    with warnings.catch_warnings():
        # Pillow warns between 1x and 2x the pixel limit; we enforce the limit ourselves
        warnings.simplefilter("ignore", Image.DecompressionBombWarning)
        image = _decode(uploaded)

    if image.mode in ("RGBA", "LA", "P"):
        rgba = image.convert("RGBA")
        flat = Image.new("RGB", rgba.size, (255, 255, 255))
        flat.paste(rgba, mask=rgba.split()[-1])
        image = flat
    else:
        image = image.convert("RGB")
    image.thumbnail((MAX_SIDE, MAX_SIDE))

    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=88, optimize=True)  # no exif= → none written
    return ContentFile(buffer.getvalue())


def document_response(profile, kind):
    """
    Stream one of a profile's documents. The caller must already have checked who is
    asking. Unknown kind or no file both read as 404.
    """
    field = DOCUMENT_FIELDS.get(kind)
    stored = getattr(profile, field, None) if field else None
    if not stored:
        raise Http404
    response = FileResponse(stored.open("rb"), content_type="image/jpeg")
    response["Cache-Control"] = "private, no-store"  # never kept by a browser or proxy cache
    response["X-Content-Type-Options"] = "nosniff"
    response["Content-Disposition"] = "inline"
    return response
