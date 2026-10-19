from django.contrib import admin

from .models import ReplacementRequest, Report


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "reporter",
        "target_user",
        "category",
        "status",
        "action_taken",
        "created_at",
    )
    list_filter = ("status", "action_taken", "category", "created_at")
    search_fields = ("reporter__full_name", "target_user__full_name", "reason", "admin_notes")
    readonly_fields = ("created_at", "updated_at")


@admin.register(ReplacementRequest)
class ReplacementRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "match", "guardian", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("guardian__user__full_name", "match__tutor__user__full_name", "reason")
    readonly_fields = ("created_at", "resolved_at")
