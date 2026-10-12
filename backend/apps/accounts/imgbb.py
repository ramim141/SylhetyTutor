"""
imgBB, a free public image host, for profile photos only.

imgBB gives every image a public URL that anyone who knows it can open, so it must never
receive identity documents; NID and student-ID scans stay in private storage
(apps/tutors/documents.py). A profile photo is shown on the public site anyway.

Configuration (environment): IMGBB_API_KEY (required), IMGBB_API_URL, IMGBB_TIMEOUT.
"""

import requests
from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import APIException


class UploadsUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Photo upload is not available right now."
    default_code = "uploads_unavailable"


class UploadFailed(APIException):
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = "The photo could not be saved. Please try again."
    default_code = "upload_failed"


def ensure_configured():
    if not settings.IMGBB_API_KEY:
        raise UploadsUnavailable()


def upload_image(data, name):
    """
    Send JPEG bytes to imgBB; return `(url, delete_url)`.

    The key goes in the POST body, not the URL, so it cannot end up in a log line. Errors
    never include the key or imgBB's raw answer.
    """
    ensure_configured()
    try:
        response = requests.post(
            settings.IMGBB_API_URL,
            data={"key": settings.IMGBB_API_KEY, "name": name},
            files={"image": (f"{name}.jpg", data, "image/jpeg")},
            timeout=settings.IMGBB_TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
        info = payload["data"]
        url = info["url"]
        delete_url = info.get("delete_url") or ""
        succeeded = payload.get("success") is True
    except (requests.RequestException, ValueError, KeyError, TypeError, AttributeError):
        raise UploadFailed() from None

    if not succeeded or not isinstance(url, str) or not url.startswith("https://"):
        raise UploadFailed()
    return url, delete_url
