from django.contrib import admin

from .models import TutorProfile


@admin.register(TutorProfile)
class TutorProfileAdmin(admin.ModelAdmin):
    list_display = (
        "get_full_name",
        "university",
        "department",
        "fee_range_display",
        "rating_display",
        "is_featured",
        "verification_status",
    )
    list_filter = (
        "verification_status",
        "is_featured",
        "university",
        "gender",
    )
    search_fields = (
        "user__full_name",
        "user__phone",
        "user__email",
        "department",
    )
    filter_horizontal = ("subjects", "class_levels", "areas")
    fieldsets = (
        ("User Association", {"fields": ("user", "gender")}),
        (
            "Education & Bio",
            {
                "fields": (
                    "university",
                    "department",
                    "year",
                    "bio",
                )
            },
        ),
        (
            "Teaching Preferences",
            {
                "fields": (
                    "subjects",
                    "class_levels",
                    "areas",
                    "fee_min",
                    "fee_max",
                )
            },
        ),
        (
            "Verification & Platform Standing",
            {
                "fields": (
                    "verification_status",
                    "is_featured",
                    "rating_avg",
                    "review_count",
                )
            },
        ),
    )

    @admin.display(description="Tutor Name", ordering="user__full_name")
    def get_full_name(self, obj):
        return obj.user.full_name

    @admin.display(description="Monthly Fee (BDT)")
    def fee_range_display(self, obj):
        return f"৳{obj.fee_min:,} - ৳{obj.fee_max:,}"

    @admin.display(description="Rating")
    def rating_display(self, obj):
        return f"★ {obj.rating_avg} ({obj.review_count})"
