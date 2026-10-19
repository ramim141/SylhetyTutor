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
    Notification.Kind.PAYMENT_VERIFIED: {
        "en": ("Payment verified", "We verified your bKash payment. Details: {link}\n"),
        "bn": ("পেমেন্ট যাচাই হয়েছে", "আপনার bKash পেমেন্ট যাচাই হয়েছে। বিস্তারিত: {link}\n"),
        "mixed": ("Payment verify হয়েছে", "আপনার bKash payment verify হয়েছে। Details: {link}\n"),
    },
    Notification.Kind.PAYMENT_REJECTED: {
        "en": (
            "Payment could not be verified",
            "We could not verify your payment.\n\nReason: {reason}\n\n"
            "Check and try again: {link}\n",
        ),
        "bn": (
            "পেমেন্ট যাচাই করা যায়নি",
            "আপনার পেমেন্ট যাচাই করা যায়নি।\n\nকারণ: {reason}\n\nদেখে আবার চেষ্টা করুন: {link}\n",
        ),
        "mixed": (
            "Payment verify করা যায়নি",
            "আপনার payment verify করা যায়নি।\n\nকারণ: {reason}\n\nদেখে আবার try করুন: {link}\n",
        ),
    },
    Notification.Kind.CONFIRM_TUITION: {
        "en": (
            "Did the tuition start?",
            "You met a tutor on SylhetyTutor. Did the tuition start? One tap, no login: {link}\n",
        ),
        "bn": (
            "টিউশন কি শুরু হয়েছে?",
            "আপনি SylhetyTutor-এ একজন টিউটরের সাথে demo করেছেন। টিউশন কি শুরু হয়েছে? "
            "এক ট্যাপে জানান, লগইন লাগবে না: {link}\n",
        ),
        "mixed": (
            "Tuition কি শুরু হয়েছে?",
            "আপনি SylhetyTutor এ একজন tutor এর সাথে demo করেছেন। Tuition কি শুরু হয়েছে? "
            "এক tap এ জানান, login লাগবে না: {link}\n",
        ),
    },
    Notification.Kind.COMMISSION_DUE: {
        "en": (
            "Commission due",
            "A guardian confirmed the tuition. Your commission is due within 7 days: {link}\n",
        ),
        "bn": (
            "কমিশন দেয়",
            "অভিভাবক টিউশন নিশ্চিত করেছেন। ৭ দিনের মধ্যে আপনার কমিশন দিন: {link}\n",
        ),
        "mixed": (
            "Commission due",
            "Guardian tuition confirm করেছেন। ৭ দিনের মধ্যে আপনার commission দিন: {link}\n",
        ),
    },
    Notification.Kind.COMMISSION_REMINDER: {
        "en": ("Commission reminder", "Your commission is overdue. Please pay: {link}\n"),
        "bn": ("কমিশনের রিমাইন্ডার", "আপনার কমিশন বাকি আছে। অনুগ্রহ করে দিন: {link}\n"),
        "mixed": ("Commission reminder", "আপনার commission বাকি আছে। অনুগ্রহ করে দিন: {link}\n"),
    },
    Notification.Kind.ACCOUNT_SUSPENDED: {
        "en": (
            "Applying is paused",
            "Your commission is more than 21 days overdue, so new applications are paused. "
            "Pay to continue: {link}\n",
        ),
        "bn": (
            "আবেদন সাময়িক বন্ধ",
            "আপনার কমিশন ২১ দিনের বেশি বাকি, তাই নতুন আবেদন বন্ধ আছে। চালু করতে দিন: {link}\n",
        ),
        "mixed": (
            "Apply সাময়িক বন্ধ",
            "আপনার commission ২১ দিনের বেশি বাকি, তাই নতুন apply বন্ধ আছে। চালু করতে দিন: {link}\n",
        ),
    },
    Notification.Kind.REVIEW_RECEIVED: {
        "en": (
            "You received a new review",
            "A guardian left a review on your tutor profile.\n\nView profile: {link}\n",
        ),
        "bn": (
            "আপনার প্রোফাইলে নতুন রিভিউ এসেছে",
            "একজন অভিভাবক আপনার প্রোফাইলে রিভিউ দিয়েছেন।\n\nপ্রোফাইল দেখুন: {link}\n",
        ),
        "mixed": (
            "আপনার profile এ নতুন review এসেছে",
            "একজন guardian আপনার tutor profile এ review দিয়েছেন।\n\nProfile দেখুন: {link}\n",
        ),
    },
    Notification.Kind.REPORT_ACTION_TAKEN: {
        "en": (
            "Update on reported issue",
            "An update regarding your account or report: {reason}\n\nDashboard: {link}\n",
        ),
        "bn": (
            "রিপোর্ট সম্পর্কিত আপডেট",
            "আপনার একাউন্ট বা অভিযোগ সম্পর্কিত আপডেট: {reason}\n\nড্যাশবোর্ড: {link}\n",
        ),
        "mixed": (
            "Report সম্পর্কিত update",
            "আপনার account বা report সম্পর্কিত update: {reason}\n\nDashboard: {link}\n",
        ),
    },
    Notification.Kind.REPLACEMENT_REQUESTED: {
        "en": (
            "Tuition replacement request received",
            "We received your tuition replacement request. Our team will contact you shortly.\n\n"
            "Dashboard: {link}\n",
        ),
        "bn": (
            "টিউশন পরিবর্তনের আবেদন গ্রহণ করা হয়েছে",
            "আপনার বিকল্প টিউটরের আবেদন গ্রহণ করা হয়েছে। আমাদের টিম দ্রুত যোগাযোগ করবে।\n\n"
            "ড্যাশবোর্ড: {link}\n",
        ),
        "mixed": (
            "Tuition replacement request নেওয়া হয়েছে",
            "আপনার replacement request পাওয়া গেছে। আমাদের team খুব দ্রুত যোগাযোগ করবে।\n\n"
            "Dashboard: {link}\n",
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
    Notification.Kind.PAYMENT_VERIFIED: "{path}",
    Notification.Kind.PAYMENT_REJECTED: "{path}",
    Notification.Kind.CONFIRM_TUITION: "{path}",
    Notification.Kind.COMMISSION_DUE: "{path}",
    Notification.Kind.COMMISSION_REMINDER: "{path}",
    Notification.Kind.ACCOUNT_SUSPENDED: "{path}",
    Notification.Kind.REVIEW_RECEIVED: "{path}",
    Notification.Kind.REPORT_ACTION_TAKEN: "{path}",
    Notification.Kind.REPLACEMENT_REQUESTED: "{path}",
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
    data = {
        "requirement_id": "",
        "demo_path": "/dashboard",
        "path": "/dashboard",
        **notification.data,
    }
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
