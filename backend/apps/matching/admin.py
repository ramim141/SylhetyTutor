from django.contrib import admin, messages

from . import services
from .models import TutorApplication


@admin.register(TutorApplication)
class TutorApplicationAdmin(admin.ModelAdmin):
    """Read-only record: the guardian decides, an admin only looks."""

    list_display = ("created_at", "tutor", "requirement", "status")
    list_filter = ("status",)
    actions = ["shortlist", "reject"]
    readonly_fields = [field.name for field in TutorApplication._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def _decide(self, request, queryset, decision):
        done = 0
        for application in queryset.select_related("requirement", "tutor__user"):
            try:
                getattr(services, decision)(application)
                done += 1
            except services.MatchingError as error:
                self.message_user(request, f"{application.pk}: {error}", messages.WARNING)
        self.message_user(request, f"{done} application(s): {decision}.")

    @admin.action(description="Shortlist the selected applications")
    def shortlist(self, request, queryset):
        self._decide(request, queryset, "shortlist")

    @admin.action(description="Reject the selected applications")
    def reject(self, request, queryset):
        self._decide(request, queryset, "reject")
