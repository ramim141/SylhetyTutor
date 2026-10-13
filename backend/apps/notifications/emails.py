"""
The email copy of a notification, for users who gave an email address (many tutors register
with a phone only; for them the in-app notification is the whole message).

Plain text, in the user's preferred language, never containing documents or contact details.
"""

import logging

from django.conf import settings
from django.core.mail import send_mail

from .models import Notification

logger = logging.getLogger(__name__)

# kind -> language -> (subject, body). {reason} and {link} are filled in.
COPY = {
    Notification.Kind.PROFILE_APPROVED: {
        "en": (
            "Your SylhetyTutor profile is live",
            "Good news: our team verified your profile, and parents can now find you in search.\n\n"
            "Open your dashboard: {link}\n",
        ),
        "bn": (
            "আপনার SylhetyTutor প্রোফাইল চালু হয়েছে",
            "সুখবর: আমাদের টিম আপনার প্রোফাইল যাচাই করেছে। এখন অভিভাবকেরা সার্চে আপনাকে খুঁজে পাবেন।\n\n"
            "ড্যাশবোর্ড খুলুন: {link}\n",
        ),
        "mixed": (
            "আপনার SylhetyTutor profile live হয়েছে",
            "সুখবর: আমাদের team আপনার profile verify করেছে। "
            "এখন guardian রা search এ আপনাকে খুঁজে পাবেন।\n\n"
            "Dashboard খুলুন: {link}\n",
        ),
    },
    Notification.Kind.PROFILE_REJECTED: {
        "en": (
            "Your SylhetyTutor profile needs changes",
            "Our team could not verify your profile yet.\n\nReason: {reason}\n\n"
            "Please fix it and submit again: {link}\n",
        ),
        "bn": (
            "আপনার SylhetyTutor প্রোফাইলে পরিবর্তন দরকার",
            "আমাদের টিম এখনো আপনার প্রোফাইল যাচাই করতে পারেনি।\n\nকারণ: {reason}\n\n"
            "ঠিক করে আবার জমা দিন: {link}\n",
        ),
        "mixed": (
            "আপনার SylhetyTutor profile এ change দরকার",
            "আমাদের team এখনো আপনার profile verify করতে পারেনি।\n\nকারণ: {reason}\n\n"
            "Fix করে আবার submit করুন: {link}\n",
        ),
    },
}

LINKS = {
    Notification.Kind.PROFILE_APPROVED: "/dashboard",
    Notification.Kind.PROFILE_REJECTED: "/tutor/profile",
}


def send_notification_email(notification):
    """Best effort: a mail server problem must never undo or block the thing that happened."""
    user = notification.user
    if not user.email:
        return False
    copy = COPY.get(notification.kind)
    if not copy:
        return False
    subject, body = copy.get(user.preferred_language) or copy["mixed"]
    link = settings.FRONTEND_URL.rstrip("/") + LINKS[notification.kind]
    try:
        send_mail(
            subject,
            body.format(link=link, reason=notification.data.get("reason", "")),
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
        )
    except Exception:  # noqa: BLE001 - any mail failure is logged, never raised
        logger.exception("Could not send %s email to user %s", notification.kind, user.pk)
        return False
    return True
