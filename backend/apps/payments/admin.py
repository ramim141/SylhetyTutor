from django.contrib import admin

from .models import Commission, Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    """Read-only: a decision goes through the verify/reject service so it is audited and told."""

    list_display = ("created_at", "user", "purpose", "amount", "transaction_id", "status")
    list_filter = ("status", "purpose")
    search_fields = ("transaction_id", "user__full_name", "user__phone")
    readonly_fields = [field.name for field in Payment._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Commission)
class CommissionAdmin(admin.ModelAdmin):
    """The tracker: read-only here; paying and waiving go through the services (and the API)."""

    list_display = ("created_at", "tutor", "amount", "due_date", "status")
    list_filter = ("status",)
    readonly_fields = [field.name for field in Commission._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
