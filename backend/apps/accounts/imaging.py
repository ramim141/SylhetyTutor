"""
Safe handling of images that users upload (profile photos, identity documents).

An upload must really be an image — decoded, not judged by its file name or Content-Type —
at most 5 MB and under a pixel limit. The copy we keep is re-encoded as JPEG: EXIF (which can
carry GPS position and camera details) is dropped, phone rotation is applied first, and
anything hidden inside the original file is discarded.
"""

import io
import warnings

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework import serializers
from rest_framework.exceptions import ErrorDetail

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_PIXELS = 40_000_000  # refuses "decompression bombs" before they are decoded
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


def upload_error(code, message):
    return serializers.ValidationError({"file": [ErrorDetail(message, code=code)]})


def _decode(uploaded):
    """Open an upload as an upright, fully loaded image, or raise a field error."""
    Image.MAX_IMAGE_PIXELS = MAX_PIXELS
    try:
        with Image.open(uploaded) as probe:
            fmt = probe.format
            width, height = probe.size
            if width * height > MAX_PIXELS:  # Pillow itself only warns until 2x this
                raise upload_error("image_too_large", "The image has too many pixels.")
            probe.verify()  # cheap structural check
        uploaded.seek(0)
        with Image.open(uploaded) as image:
            if fmt not in ALLOWED_FORMATS:
                raise upload_error("unsupported_format", "Use a JPEG, PNG or WebP photo.")
            image = ImageOps.exif_transpose(image)  # honour phone rotation, then drop EXIF
            image.load()
            return image
    except serializers.ValidationError:
        raise
    except Image.DecompressionBombError:
        raise upload_error("image_too_large", "The image has too many pixels.") from None
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError):
        raise upload_error("not_an_image", "This file is not a readable image.") from None


def clean_image(uploaded, *, max_side, square=False):
    """
    Validate an upload and return a clean JPEG copy as a ContentFile.

    `max_side` caps the long side (never enlarges). `square=True` crops to the centre
    (slightly above, where faces are) — for profile photos.
    """
    if uploaded is None:
        raise upload_error("required", "No file was submitted.")
    if uploaded.size > MAX_UPLOAD_BYTES:
        raise upload_error("file_too_large", "The file is larger than 5 MB.")

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

    if square:
        side = min(max_side, *image.size)
        image = ImageOps.fit(image, (side, side), method=Image.LANCZOS, centering=(0.5, 0.4))
    else:
        image.thumbnail((max_side, max_side))

    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=88, optimize=True)  # no exif= → none written
    return ContentFile(buffer.getvalue())
