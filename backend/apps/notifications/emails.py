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
    Notification.Kind.APPLICATION_RECEIVED: {
        "en": (
            "A tutor applied to your requirement",
            "A verified tutor applied to your tuition requirement.\n\nSee who applied: {link}\n",
        ),
        "bn": (
            "আপনার requirement-এ একজন টিউটর আবেদন করেছেন",
            "একজন যাচাই-করা টিউটর আপনার টিউশনের জন্য আবেদন করেছেন।\n\nকারা আবেদন করেছেন দেখুন: {link}\n",
        ),
        "mixed": (
            "আপনার requirement এ একজন tutor apply করেছেন",
            "একজন verified tutor আপনার tuition এর জন্য apply করেছেন।\n\n"
            "কারা apply করেছেন দেখুন: {link}\n",
        ),
    },
    Notification.Kind.APPLICATION_SHORTLISTED: {
        "en": (
            "A guardian shortlisted you",
            "Good news: a guardian shortlisted you. They will pick a demo time next.\n\n"
            "Your applications: {link}\n",
        ),
        "bn": (
            "একজন অভিভাবক আপনাকে shortlist করেছেন",
            "সুখবর: একজন অভিভাবক আপনাকে shortlist করেছেন। এরপর তিনি demo-র সময় ঠিক করবেন।\n\n"
            "আপনার আবেদন: {link}\n",
        ),
        "mixed": (
            "একজন guardian আপনাকে shortlist করেছেন",
            "সুখবর: একজন guardian আপনাকে shortlist করেছেন। এরপর তিনি demo এর সময় ঠিক করবেন।\n\n"
            "আপনার application: {link}\n",
        ),
    },
    Notification.Kind.APPLICATION_REJECTED: {
        "en": (
            "Your application was not taken",
            "The guardian chose other tutors this time. Keep applying: {link}\n",
        ),
        "bn": (
            "আপনার আবেদন এবার নেওয়া হয়নি",
            "অভিভাবক এবার অন্য টিউটর বেছে নিয়েছেন। আবেদন করতে থাকুন: {link}\n",
        ),
        "mixed": (
            "আপনার application এবার নেওয়া হয়নি",
            "Guardian এবার অন্য tutor বেছে নিয়েছেন। Apply করতে থাকুন: {link}\n",
        ),
    },
    Notification.Kind.DEMO_BOOKED: {
        "en": (
            "Demo class booked",
            "A demo class is booked for {when}.\n\nOpen it to see the details: {link}\n",
        ),
        "bn": (
            "Demo class ঠিক হয়েছে",
            "{when} সময়ে একটি demo class ঠিক হয়েছে।\n\nবিস্তারিত দেখুন: {link}\n",
        ),
        "mixed": (
            "Demo class ঠিক হয়েছে",
            "{when} এ একটি demo class ঠিক হয়েছে।\n\nDetails দেখুন: {link}\n",
        ),
    },
}

LINKS = {
    Notification.Kind.PROFILE_APPROVED: "/dashboard",
    Notification.Kind.PROFILE_REJECTED: "/tutor/profile",
    Notification.Kind.APPLICATION_RECEIVED: "/requirements/{requirement_id}/applicants",
    Notification.Kind.APPLICATION_SHORTLISTED: "/tutor/applications",
    Notification.Kind.APPLICATION_REJECTED: "/tutor/applications",
    Notification.Kind.DEMO_BOOKED: "{demo_path}",
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
    data = {"requirement_id": "", "demo_path": "/dashboard", **notification.data}
    link = settings.FRONTEND_URL.rstrip("/") + LINKS[notification.kind].format(**data)
    try:
        send_mail(
            subject,
            body.format(
                link=link,
                reason=notification.data.get("reason", ""),
                when=notification.data.get("when", ""),
            ),
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
        )
    except Exception:  # noqa: BLE001 - any mail failure is logged, never raised
        logger.exception("Could not send %s email to user %s", notification.kind, user.pk)
        return False
    return True
