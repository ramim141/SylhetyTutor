from django import forms
from django.contrib import admin, messages
from django.contrib.admin.helpers import ActionForm
from django.core.exceptions import PermissionDenied
from django.http import Http404
from django.urls import path, reverse
from django.utils.html import format_html, format_html_join

from . import review
from .documents import document_response
from .models import TutorAvailability, TutorProfile, VerificationEvent


class TutorAvailabilityInline(admin.TabularInline):
    model = TutorAvailability
    extra = 0


class VerificationEventInline(admin.TabularInline):
    model = VerificationEvent
    extra = 0
    can_delete = False
    fields = ("created_at", "action", "actor", "reason")
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


class ReviewActionForm(ActionForm):
    reason = forms.CharField(
        required=False,
        label="Reason",
        widget=forms.TextInput(attrs={"placeholder": "Required to reject; the tutor sees it"}),
    )


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
    inlines = [TutorAvailabilityInline, VerificationEventInline]
    action_form = ReviewActionForm
    actions = ["approve_profiles", "reject_profiles"]
    # Status changes only through the approve / reject actions, so each one is recorded and told
    readonly_fields = (
        "verification_status",
        "rejection_reason",
        "submitted_at",
        "verified_at",
        "verified_by",
        "document_links",
        "suspended_at",
    )
    fieldsets = (
        ("User Association", {"fields": ("user", "gender")}),
        (
            "Education & Bio",
            {
                "fields": (
                    "university",
                    "department",
                    "year",
                    "student_id_number",
                    "document_links",
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
                    "rejection_reason",
                    "submitted_at",
                    "verified_at",
                    "verified_by",
                    "is_featured",
                    "rating_avg",
                    "review_count",
                )
            },
        ),
        ("Money", {"fields": ("founding_until", "suspended_at")}),
    )

    def get_queryset(self, request):
        # a draft is still being written by the tutor: admins never see it (Sprint_1.md)
        return (
            super()
            .get_queryset(request)
            .exclude(verification_status=TutorProfile.VerificationStatus.DRAFT)
            .select_related("user", "university")
        )

    def _decide(self, request, queryset, decide):
        done = 0
        for profile in queryset:
            try:
                decide(profile)
            except review.ReviewError as exc:
                self.message_user(request, f"{profile}: {exc}", messages.ERROR)
            else:
                done += 1
        return done

    @admin.action(description="Approve selected pending profiles")
    def approve_profiles(self, request, queryset):
        done = self._decide(request, queryset, lambda p: review.approve(p, request.user))
        if done:
            self.message_user(request, f"{done} profile(s) approved.", messages.SUCCESS)

    @admin.action(description="Reject selected profiles (write the reason first)")
    def reject_profiles(self, request, queryset):
        reason = request.POST.get("reason", "")
        done = self._decide(request, queryset, lambda p: review.reject(p, request.user, reason))
        if done:
            self.message_user(request, f"{done} profile(s) rejected.", messages.SUCCESS)

    @admin.display(description="Tutor Name", ordering="user__full_name")
    def get_full_name(self, obj):
        return obj.user.full_name

    @admin.display(description="Monthly Fee (BDT)")
    def fee_range_display(self, obj):
        if obj.fee_min is None or obj.fee_max is None:
            return "—"
        return f"৳{obj.fee_min:,} - ৳{obj.fee_max:,}"

    @admin.display(description="Rating")
    def rating_display(self, obj):
        return f"★ {obj.rating_avg} ({obj.review_count})"

    # The scans are never shown through a file widget (private storage has no URL); admins open
    # them through this session-protected view instead.
    def get_urls(self):
        custom = [
            path(
                "<uuid:pk>/document/<str:kind>/",
                self.admin_site.admin_view(self.document_view),
                name="tutors_tutorprofile_document",
            )
        ]
        return custom + super().get_urls()

    def document_view(self, request, pk, kind):
        if not self.has_view_permission(request):
            raise PermissionDenied
        profile = self.get_object(request, str(pk))
        if profile is None:
            raise Http404
        return document_response(profile, kind)

    @admin.display(description="NID / Student ID scans")
    def document_links(self, obj):
        if not obj.pk:
            return "—"
        parts = []
        for kind, label, stored in (
            ("nid", "NID", obj.nid_photo),
            ("student_id", "Student ID", obj.student_id_photo),
        ):
            if stored:
                url = reverse("admin:tutors_tutorprofile_document", args=[obj.pk, kind])
                parts.append(format_html('<a href="{}" target="_blank">{}: view</a>', url, label))
            else:
                parts.append(format_html("{}: missing", label))
        return format_html_join(" · ", "{}", ((part,) for part in parts))
