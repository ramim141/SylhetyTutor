"""
Seed reference lookup data for Sylhet city.
Sprint 1 — Architecture Doc Section 3.2-3.4 and Sprint_1.md.
Idempotent command: uses update_or_create so running multiple times will not duplicate.
"""

from django.core.management.base import BaseCommand

from apps.lookups.models import Area, ClassLevel, Subject, University

AREAS_DATA = [
    {"slug": "amberkhana", "name_en": "Amberkhana", "name_bn": "আম্বরখানা", "sort_order": 1},
    {"slug": "zindabazar", "name_en": "Zindabazar", "name_bn": "জিন্দাবাজার", "sort_order": 2},
    {"slug": "akhalia", "name_en": "Akhalia", "name_bn": "আখালিয়া", "sort_order": 3},
    {"slug": "shibganj", "name_en": "Shibganj", "name_bn": "শিবগঞ্জ", "sort_order": 4},
    {"slug": "subidbazar", "name_en": "Subidbazar", "name_bn": "সুবিদবাজার", "sort_order": 5},
    {"slug": "uposhohor", "name_en": "Uposhohor", "name_bn": "উপশহর", "sort_order": 6},
    {"slug": "tilagarh", "name_en": "Tilagarh", "name_bn": "টিলাগড়", "sort_order": 7},
    {"slug": "pathantula", "name_en": "Pathantula", "name_bn": "পাঠানটুলা", "sort_order": 8},
    {"slug": "lamabazar", "name_en": "Lamabazar", "name_bn": "লামাবাজার", "sort_order": 9},
    {
        "slug": "modina-market",
        "name_en": "Modina Market",
        "name_bn": "মদিনা মার্কেট",
        "sort_order": 10,
    },
    {"slug": "bondor-bazar", "name_en": "Bondor Bazar", "name_bn": "বন্দরবাজার", "sort_order": 11},
    {"slug": "kumarpara", "name_en": "Kumarpara", "name_bn": "কুমারপাড়া", "sort_order": 12},
    {"slug": "mirabazar", "name_en": "Mirabazar", "name_bn": "মীরাবাজার", "sort_order": 13},
    {"slug": "chowhatta", "name_en": "Chowhatta", "name_bn": "চৌহাট্টা", "sort_order": 14},
]

SUBJECTS_DATA = [
    {"slug": "math", "name_en": "Math", "name_bn": "গণিত", "sort_order": 1},
    {"slug": "higher-math", "name_en": "Higher Math", "name_bn": "উচ্চতর গণিত", "sort_order": 2},
    {"slug": "physics", "name_en": "Physics", "name_bn": "পদার্থবিজ্ঞান", "sort_order": 3},
    {"slug": "chemistry", "name_en": "Chemistry", "name_bn": "রসায়ন", "sort_order": 4},
    {"slug": "biology", "name_en": "Biology", "name_bn": "জীববিজ্ঞান", "sort_order": 5},
    {"slug": "english", "name_en": "English", "name_bn": "ইংরেজি", "sort_order": 6},
    {"slug": "bangla", "name_en": "Bangla", "name_bn": "বাংলা", "sort_order": 7},
    {"slug": "ict", "name_en": "ICT", "name_bn": "তথ্য ও যোগাযোগ প্রযুক্তি", "sort_order": 8},
    {"slug": "accounting", "name_en": "Accounting", "name_bn": "হিসাববিজ্ঞান", "sort_order": 9},
    {
        "slug": "business-studies",
        "name_en": "Business Studies",
        "name_bn": "ব্যবসায় শিক্ষা",
        "sort_order": 10,
    },
    {
        "slug": "general-science",
        "name_en": "General Science",
        "name_bn": "সাধারণ বিজ্ঞান",
        "sort_order": 11,
    },
    {"slug": "ielts", "name_en": "IELTS", "name_bn": "আইইএলটিএস", "sort_order": 12},
]

CLASS_LEVELS_DATA = [
    {"slug": "class-1-5", "name_en": "Class 1–5", "name_bn": "১ম–৫ম শ্রেণি", "sort_order": 1},
    {"slug": "class-6-8", "name_en": "Class 6–8", "name_bn": "৬ষ্ঠ–৮ম শ্রেণি", "sort_order": 2},
    {"slug": "ssc", "name_en": "SSC (Class 9–10)", "name_bn": "এসএসসি (৯ম–১০ম)", "sort_order": 3},
    {
        "slug": "hsc",
        "name_en": "HSC (Class 11–12)",
        "name_bn": "এইচএসসি (১১শ–১২শ)",
        "sort_order": 4,
    },
    {
        "slug": "english-medium",
        "name_en": "English Medium",
        "name_bn": "ইংলিশ মিডিয়াম",
        "sort_order": 5,
    },
]

UNIVERSITIES_DATA = [
    {
        "slug": "sust",
        "name_en": "Shahjalal University of Science and Technology",
        "name_bn": "শাহজালাল বিজ্ঞান ও প্রযুক্তি বিশ্ববিদ্যালয়",
        "short_name": "SUST",
        "sort_order": 1,
    },
    {
        "slug": "metropolitan",
        "name_en": "Metropolitan University",
        "name_bn": "মেট্রোপলিটান ইউনিভার্সিটি",
        "short_name": "MU",
        "sort_order": 2,
    },
    {
        "slug": "leading",
        "name_en": "Leading University",
        "name_bn": "লিডিং ইউনিভার্সিটি",
        "short_name": "LU",
        "sort_order": 3,
    },
]


class Command(BaseCommand):
    help = (
        "Seed reference lookups for Sylhet (14 areas, 12 subjects, 5 class levels, 3 universities)"
    )

    def handle(self, *args, **options):
        # 1. Areas
        for item in AREAS_DATA:
            Area.objects.update_or_create(
                slug=item["slug"],
                defaults={
                    "name_en": item["name_en"],
                    "name_bn": item["name_bn"],
                    "sort_order": item["sort_order"],
                    "is_active": True,
                },
            )

        # 2. Subjects
        for item in SUBJECTS_DATA:
            Subject.objects.update_or_create(
                slug=item["slug"],
                defaults={
                    "name_en": item["name_en"],
                    "name_bn": item["name_bn"],
                    "sort_order": item["sort_order"],
                    "is_active": True,
                },
            )

        # 3. Class Levels
        for item in CLASS_LEVELS_DATA:
            ClassLevel.objects.update_or_create(
                slug=item["slug"],
                defaults={
                    "name_en": item["name_en"],
                    "name_bn": item["name_bn"],
                    "sort_order": item["sort_order"],
                    "is_active": True,
                },
            )

        # 4. Universities
        for item in UNIVERSITIES_DATA:
            University.objects.update_or_create(
                slug=item["slug"],
                defaults={
                    "name_en": item["name_en"],
                    "name_bn": item["name_bn"],
                    "short_name": item["short_name"],
                    "sort_order": item["sort_order"],
                    "is_active": True,
                },
            )

        areas_count = Area.objects.count()
        subjects_count = Subject.objects.count()
        class_count = ClassLevel.objects.count()
        unis_count = University.objects.count()

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded lookups:\n"
                f"  - Areas: {areas_count}\n"
                f"  - Subjects: {subjects_count}\n"
                f"  - Class Levels: {class_count}\n"
                f"  - Universities: {unis_count}"
            )
        )
