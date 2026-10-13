"""
Public profile addresses: /tutors/rahim-uddin-physics-math (Sprint Plan, Sprint 3;
Architecture Doc §13.2). A slug is made once, when a profile becomes public, and then
never changes, so links people shared keep working even if the tutor edits subjects.
"""

from django.utils.text import slugify

# First path words under /tutors/ that already mean something else
RESERVED = frozenset({"me", "documents", "featured", "area", "subject", "register"})
MAX_LENGTH = 100


def build_slug(profile, model):
    """Name plus up to two subjects, made unique with -2, -3 … ('tutor' if the name has no
    Latin letters, e.g. a Bengali name)."""
    # a profile not saved yet has no subjects (and its relation cannot be queried)
    subjects = [] if profile._state.adding else profile.subjects.order_by("sort_order", "slug")[:2]
    parts = [slugify(profile.user.full_name), *(subject.slug for subject in subjects)]
    base = "-".join(part for part in parts if part)[:MAX_LENGTH].strip("-") or "tutor"

    candidate, number = base, 2
    while (
        candidate in RESERVED
        or model.objects.filter(slug=candidate).exclude(pk=profile.pk).exists()
    ):
        suffix = f"-{number}"
        candidate = f"{base[: MAX_LENGTH - len(suffix)]}{suffix}"
        number += 1
    return candidate
