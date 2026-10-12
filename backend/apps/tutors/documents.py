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

import uuid

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.http import FileResponse, Http404

from apps.accounts.imaging import clean_image

MAX_SIDE = 2000  # long side of the stored copy; plenty to read a card, bounded storage

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


def clean_document_image(uploaded):
    """Validate a scan and return the clean JPEG copy to store (see apps/accounts/imaging.py)."""
    return clean_image(uploaded, max_side=MAX_SIDE)


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
