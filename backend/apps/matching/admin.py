from django.contrib import admin

from .models import TutorApplication


@admin.register(TutorApplication)
class TutorApplicationAdmin(admin.ModelAdmin):
    """Read-only record: the guardian decides, an admin only looks."""

    list_display = ("created_at", "tutor", "requirement", "status")
    list_filter = ("status",)
    readonly_fields = [field.name for field in TutorApplication._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
