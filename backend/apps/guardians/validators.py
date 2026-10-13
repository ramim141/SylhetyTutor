"""
Free text on a requirement is read by tutors before any demo is booked, and contact opens only
after one (Architecture Doc 8.8). So a phone number, e-mail, link or chat handle in it would
let both sides skip the platform: refuse it.
"""

import re

from django.core.exceptions import ValidationError

BENGALI_DIGITS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")

LINK = re.compile(r"https?:|www\.|\.(com|net|org|bd|info|me)\b", re.IGNORECASE)
CHAT_APP = re.compile(
    r"whats\s*app|\bimo\b|telegram|messenger|facebook|fb\.com|"
    r"হোয়াটস\s*অ্যাপ|ইমো|টেলিগ্রাম|মেসেঞ্জার|ফেসবুক",
    re.IGNORECASE,
)
# Digits with spaces, dots, dashes or brackets between them
LONG_DIGIT_RUN = re.compile(r"(?:\d[\s.\-()]*){8,}")


def contact_not_allowed(value):
    text = (value or "").translate(BENGALI_DIGITS)
    if "@" in text or LINK.search(text) or CHAT_APP.search(text) or LONG_DIGIT_RUN.search(text):
        raise ValidationError(
            "Contact details are shared after a demo is booked, not here.",
            code="contact_not_allowed",
        )
    return value
