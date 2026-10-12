"""
Demo tutors for local development and staging — Sprint Plan (Sprint 2).

Never for production: the command refuses to run under ``config.settings.production``
unless ``ALLOW_SEED_DEMO=true`` is set (staging). Demo profiles carry no ratings or
reviews (a new tutor shows "New", never an invented score), have no usable password
and say so in their bio.

    python manage.py seed_demo            # create / refresh 30 demo tutors (idempotent)
    python manage.py seed_demo --reset    # remove the demo tutors
"""

import os

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

from apps.accounts.models import User
from apps.lookups.models import Area, ClassLevel, Subject, University
from apps.tutors.models import TutorProfile

PHONE_PREFIX = "0190000"
DEMO_BIO = "Demo profile for testing — not a real tutor."

# (name, gender)
PEOPLE = [
    ("Rahim Uddin", "male"),
    ("Nusrat Jahan", "female"),
    ("Tanvir Ahmed", "male"),
    ("Sadia Islam", "female"),
    ("Mahmudul Hasan", "male"),
    ("Farhana Akter", "female"),
    ("Abdullah Al Mamun", "male"),
    ("Jannatul Ferdous", "female"),
    ("Shahriar Kabir", "male"),
    ("Mst. Rokeya Begum", "female"),
    ("Imran Hossain", "male"),
    ("Tasnim Rahman", "female"),
    ("Arif Chowdhury", "male"),
    ("Mehjabin Sultana", "female"),
    ("Sabbir Ahmed", "male"),
    ("Anika Tabassum", "female"),
    ("Rafiqul Islam", "male"),
    ("Maliha Khan", "female"),
    ("Jahid Hasan", "male"),
    ("Samia Noor", "female"),
    ("Nayeem Uddin", "male"),
    ("Ruma Das", "female"),
    ("Fahim Faisal", "male"),
    ("Lamia Haque", "female"),
    ("Kamrul Hasan", "male"),
    ("Sumaiya Akter", "female"),
    ("Parvez Mia", "male"),
    ("Dipa Roy", "female"),
    ("Ashraful Alam", "male"),
    ("Ishrat Jahan", "female"),
]

UNIVERSITIES = ["sust", "metropolitan", "leading"]
DEPARTMENTS = ["Physics", "Mathematics", "Chemistry", "English", "CSE", "BBA", "Zoology", "Bangla"]
YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"]
CLASS_PATTERNS = [
    ("class-1-5", "class-6-8"),
    ("class-6-8", "ssc"),
    ("ssc", "hsc"),
    ("hsc",),
    ("english-medium", "class-6-8"),
    ("class-1-5",),
]
AREA_SLUGS = [
    "amberkhana", "zindabazar", "akhalia", "shibganj", "subidbazar", "uposhohor", "tilagarh",
    "pathantula", "lamabazar", "modina-market", "bondor-bazar", "kumarpara", "mirabazar",
    "chowhatta",
]  # fmt: skip
SUBJECT_SLUGS = [
    "math", "higher-math", "physics", "chemistry", "biology", "english", "bangla", "ict",
    "accounting", "business-studies", "general-science", "ielts",
]  # fmt: skip
FEATURED = {0, 5, 11}
PENDING = {26, 27}
REJECTED = {28, 29}


def _pick(slugs, start, count):
    return [slugs[(start + offset) % len(slugs)] for offset in range(count)]


def demo_spec(index):
    """Deterministic profile data for the index-th demo tutor."""
    name, gender = PEOPLE[index]
    if index in PENDING:
        status = TutorProfile.VerificationStatus.PENDING
    elif index in REJECTED:
        status = TutorProfile.VerificationStatus.REJECTED
    else:
        status = TutorProfile.VerificationStatus.APPROVED
    fee_min = 3000 + (index % 5) * 500
    return {
        "phone": f"{PHONE_PREFIX}{index + 1:04d}",
        "name": name,
        "gender": gender,
        "university": UNIVERSITIES[index % 3],
        "department": DEPARTMENTS[index % len(DEPARTMENTS)],
        "year": YEARS[index % len(YEARS)],
        "fee_min": fee_min,
        "fee_max": fee_min + 2000 + (index % 3) * 500,
        "areas": _pick(AREA_SLUGS, index * 2, 3 if index % 4 == 0 else 2),
        "subjects": _pick(SUBJECT_SLUGS, index * 3, 3 if index % 3 == 0 else 2),
        "classes": CLASS_PATTERNS[index % len(CLASS_PATTERNS)],
        "is_featured": index in FEATURED and status == TutorProfile.VerificationStatus.APPROVED,
        "status": status,
    }


def is_demo_user(user):
    profile = getattr(user, "tutor_profile", None)
    return bool(
        user.phone and user.phone.startswith(PHONE_PREFIX) and profile and profile.bio == DEMO_BIO
    )


class Command(BaseCommand):
    help = "Create (or with --reset remove) 30 demo tutors. Local and staging only."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete the demo tutors")

    def handle(self, *args, **options):
        self._refuse_in_production()
        if options["reset"]:
            return self._reset()
        call_command("seed_data", verbosity=0)
        for index in range(len(PEOPLE)):
            self._upsert(demo_spec(index))
        approved = TutorProfile.objects.filter(
            user__phone__startswith=PHONE_PREFIX,
            verification_status=TutorProfile.VerificationStatus.APPROVED,
        ).count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Demo tutors ready: {len(PEOPLE)} ({approved} approved, "
                f"{len(PENDING)} pending, {len(REJECTED)} rejected)."
            )
        )

    def _refuse_in_production(self):
        module = os.environ.get("DJANGO_SETTINGS_MODULE", "")
        allowed = os.environ.get("ALLOW_SEED_DEMO", "").lower() == "true"
        if module.endswith(".production") and not allowed:
            raise CommandError(
                "seed_demo creates fake tutors and must never run in production. "
                "(Staging: set ALLOW_SEED_DEMO=true.)"
            )

    def _reset(self):
        users = User.objects.filter(phone__startswith=PHONE_PREFIX).select_related("tutor_profile")
        doomed = [user.pk for user in users if is_demo_user(user)]
        User.objects.filter(pk__in=doomed).delete()
        self.stdout.write(self.style.SUCCESS(f"Removed {len(doomed)} demo tutors."))

    def _upsert(self, spec):
        user = User.objects.filter(phone=spec["phone"]).first()
        if user is None:
            user = User.objects.create_user(
                full_name=spec["name"], phone=spec["phone"], role=User.Role.TUTOR
            )
        elif not is_demo_user(user):
            raise CommandError(f"{spec['phone']} belongs to a real account; not touching it.")
        else:
            user.full_name = spec["name"]
            user.save(update_fields=["full_name"])
        user.set_unusable_password()
        user.save(update_fields=["password"])

        profile, _ = TutorProfile.objects.update_or_create(
            user=user,
            defaults={
                "gender": spec["gender"],
                "university": University.objects.get(slug=spec["university"]),
                "department": spec["department"],
                "year": spec["year"],
                "bio": DEMO_BIO,
                "fee_min": spec["fee_min"],
                "fee_max": spec["fee_max"],
                "is_featured": spec["is_featured"],
                "verification_status": spec["status"],
                "rating_avg": 0,
                "review_count": 0,
            },
        )
        profile.areas.set(Area.objects.filter(slug__in=spec["areas"]))
        profile.subjects.set(Subject.objects.filter(slug__in=spec["subjects"]))
        profile.class_levels.set(ClassLevel.objects.filter(slug__in=spec["classes"]))
