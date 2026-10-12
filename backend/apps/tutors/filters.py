"""
Tutor search filters — Sprint Plan (Sprint 2), Architecture Doc §7.1.

All parameters are optional and combinable. Lookups are matched by slug, so a shared
link such as ``/tutors?area=amberkhana&subject=physics`` always means the same thing.
"""

from django.db.models import Q
from django_filters import rest_framework as filters

from .models import TutorProfile

SORT_ORDERINGS = {
    "featured": ("-is_featured", "-rating_avg", "-review_count", "-created_at"),
    "rating": ("-rating_avg", "-review_count", "-created_at"),
    "newest": ("-created_at",),
}


class TutorFilterSet(filters.FilterSet):
    area = filters.CharFilter(field_name="areas__slug", distinct=True)
    subject = filters.CharFilter(field_name="subjects__slug", distinct=True)
    class_level = filters.CharFilter(field_name="class_levels__slug", distinct=True)
    university = filters.CharFilter(field_name="university__slug")
    gender = filters.ChoiceFilter(choices=TutorProfile.Gender.choices)
    # A tutor matches when their fee range overlaps the guardian's budget.
    fee_min = filters.NumberFilter(method="filter_fee_min", min_value=0)
    fee_max = filters.NumberFilter(method="filter_fee_max", min_value=0)
    q = filters.CharFilter(method="filter_q")
    sort = filters.ChoiceFilter(
        choices=[(key, key) for key in SORT_ORDERINGS],
        method="filter_sort",
        empty_label=None,
    )

    class Meta:
        model = TutorProfile
        fields = []

    def filter_fee_min(self, queryset, name, value):
        return queryset.filter(fee_max__gte=value)

    def filter_fee_max(self, queryset, name, value):
        return queryset.filter(fee_min__lte=value)

    def filter_q(self, queryset, name, value):
        value = value.strip()
        if not value:
            return queryset
        return queryset.filter(
            Q(user__full_name__icontains=value)
            | Q(department__icontains=value)
            | Q(bio__icontains=value)
            | Q(subjects__name_en__icontains=value)
            | Q(subjects__name_bn__icontains=value)
            | Q(areas__name_en__icontains=value)
            | Q(areas__name_bn__icontains=value)
        ).distinct()

    def filter_sort(self, queryset, name, value):
        return queryset.order_by(*SORT_ORDERINGS[value])
