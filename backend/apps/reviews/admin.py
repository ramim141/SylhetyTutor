from django.contrib import admin

from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "tutor", "guardian", "rating", "created_at")
    list_filter = ("rating", "created_at")
    search_fields = ("tutor__user__full_name", "guardian__user__full_name", "comment")
    readonly_fields = ("created_at", "updated_at")
