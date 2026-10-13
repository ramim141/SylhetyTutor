from django.contrib import admin

from .models import GuardianProfile, Requirement


@admin.register(GuardianProfile)
class GuardianProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "phone_verified", "created_at")
    search_fields = ("user__full_name", "user__phone")


@admin.register(Requirement)
class RequirementAdmin(admin.ModelAdmin):
    """Read-only: an admin looks at what guardians posted, the guardian is the one who edits it."""

    list_display = ("created_at", "guardian", "area", "class_level", "status", "published_at")
    list_filter = ("status", "area", "class_level")
    readonly_fields = [field.name for field in Requirement._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
