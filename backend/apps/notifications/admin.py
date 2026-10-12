from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Read-only: notifications are a record of what was sent, not something to edit."""

    list_display = ("created_at", "user", "kind", "read_at")
    list_filter = ("kind",)
    search_fields = ("user__full_name", "user__phone", "user__email")
    readonly_fields = [field.name for field in Notification._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
