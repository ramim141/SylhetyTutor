"""
Phone and email normalization and validation for Sylhet / Bangladesh users.
Architecture Doc Section 3.1 & Sprint_1.md.
"""

import re

from django.core.exceptions import ValidationError

BD_PHONE_REGEX = re.compile(r"^01[3-9]\d{8}$")


def normalize_phone(raw_phone: str) -> str:
    """
    Normalizes Bangladeshi mobile numbers to 11-digit local format:
    e.g. '+8801712-345678' -> '01712345678'
         '8801712 345678' -> '01712345678'
    """
    if not raw_phone:
        return ""
    # Strip all non-digit and non-plus characters
    cleaned = re.sub(r"[\s\-\(\)]", "", str(raw_phone).strip())

    if cleaned.startswith("+880"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("+88"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("880"):
        cleaned = cleaned[2:]
    elif cleaned.startswith("88"):
        cleaned = cleaned[2:]

    return cleaned


def validate_bd_phone(raw_phone: str) -> str:
    """
    Normalizes and validates a Bangladeshi phone number.
    Raises ValidationError with code 'invalid_phone' if invalid.
    """
    normalized = normalize_phone(raw_phone)
    if not normalized:
        raise ValidationError("Phone number cannot be empty.", code="required")

    if not BD_PHONE_REGEX.match(normalized):
        raise ValidationError(
            "Enter a valid 11-digit Bangladeshi mobile number starting with 01[3-9].",
            code="invalid_phone",
        )

    return normalized


def normalize_email_address(raw_email: str) -> str:
    """
    Returns stripped and lowercased email string.
    """
    if not raw_email:
        return ""
    return str(raw_email).strip().lower()
