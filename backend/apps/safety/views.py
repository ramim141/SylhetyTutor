"""
Views for safety, reports and replacement requests (Sprint 7).
"""

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.exceptions import ErrorDetail, NotFound, PermissionDenied, ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.matching.models import Match
from apps.notifications.models import Notification
from apps.tutors.models import TutorProfile
from config.exceptions import ConflictError

from .models import ReplacementRequest, Report
from .serializers import (
    ReplacementRequestAdminSerializer,
    ReplacementRequestCreateSerializer,
    ReplacementRequestResolveSerializer,
    ReportAdminSerializer,
    ReportCreateSerializer,
    ReportResolveSerializer,
    ReportSuspendSerializer,
)

User = get_user_model()


class ReportSubmitThrottle(UserRateThrottle):
    rate = "10/hour"


class ReportPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50

    def get_paginated_response(self, data, counts=None):
        response = super().get_paginated_response(data)
        if counts is not None:
            response.data["counts"] = counts
        return response


class IsAdminUserOrStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.role == "admin" or request.user.is_staff)
        )


class CreateReportView(APIView):
    """
    Submit a report against another user / tutor.
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ReportSubmitThrottle]

    def post(self, request):
        if request.user.role not in [User.Role.GUARDIAN, User.Role.TUTOR]:
            raise PermissionDenied(
                {"detail": "Only guardians and tutors can submit reports.", "code": "forbidden"}
            )

        serializer = ReportCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_user = None
        target_user_id = serializer.validated_data.get("target_user_id")
        target_slug = serializer.validated_data.get("target_slug")

        if target_user_id:
            try:
                target_user = User.objects.get(id=target_user_id)
            except User.DoesNotExist as err:
                raise NotFound(
                    {"detail": "Target user not found.", "code": "target_not_found"}
                ) from err
        elif target_slug:
            try:
                tutor = TutorProfile.objects.select_related("user").get(slug=target_slug)
                target_user = tutor.user
            except TutorProfile.DoesNotExist as err:
                raise NotFound(
                    {"detail": "Target tutor not found.", "code": "target_not_found"}
                ) from err

        if target_user == request.user:
            raise ValidationError(
                {"detail": ErrorDetail("You cannot report yourself.", "self_report")}
            )

        report = Report.objects.create(
            reporter=request.user,
            target_user=target_user,
            category=serializer.validated_data["category"],
            reason=serializer.validated_data["reason"],
        )

        return Response(
            {
                "id": report.id,
                "message": "Report submitted successfully. Our team will review it.",
                "created_at": report.created_at,
            },
            status=status.HTTP_201_CREATED,
        )


class CreateReplacementRequestView(APIView):
    """
    11.5 Free Replacement Guarantee:
    Guardian requests replacement for an unsatisfactory match.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, match_id):
        if request.user.role != "guardian":
            raise PermissionDenied(
                {"detail": "Only guardians can request replacements.", "code": "only_guardian"}
            )

        guardian = getattr(request.user, "guardian_profile", None)
        if not guardian:
            raise PermissionDenied(
                {"detail": "Guardian profile required.", "code": "guardian_profile_required"}
            )

        try:
            match = Match.objects.select_related("requirement__guardian", "tutor__user").get(
                id=match_id
            )
        except Match.DoesNotExist as err:
            raise NotFound({"detail": "Match not found.", "code": "match_not_found"}) from err

        if match.requirement.guardian != guardian:
            raise PermissionDenied(
                {"detail": "You do not own this match.", "code": "not_match_owner"}
            )

        if match.status not in (Match.Status.TRIAL_SCHEDULED, Match.Status.CONFIRMED):
            raise ConflictError(
                "Replacement can only be requested for active scheduled or confirmed matches.",
                code="invalid_match_status",
            )

        if ReplacementRequest.objects.filter(
            match=match, status=ReplacementRequest.Status.PENDING
        ).exists():
            raise ConflictError(
                "A replacement request is already pending for this match.",
                code="already_requested",
            )

        serializer = ReplacementRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        replacement = ReplacementRequest.objects.create(
            match=match,
            guardian=guardian,
            reason=serializer.validated_data["reason"],
        )

        # Notify guardian
        Notification.objects.create(
            user=request.user,
            kind=Notification.Kind.REPLACEMENT_REQUESTED,
            data={"match_id": str(match.id), "path": "/dashboard"},
        )

        return Response(
            {
                "id": replacement.id,
                "message": (
                    "Replacement request received. Our team will assist you within 48 hours."
                ),
                "created_at": replacement.created_at,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminReportListView(APIView):
    """
    Admin complaints queue.
    """

    permission_classes = [IsAdminUserOrStaff]

    def get(self, request):
        status_filter = request.query_params.get("status")
        qs = Report.objects.select_related("reporter", "target_user", "target_user__tutor_profile")

        counts = {
            "all": Report.objects.count(),
            "pending": Report.objects.filter(status=Report.Status.PENDING).count(),
            "reviewed": Report.objects.filter(status=Report.Status.REVIEWED).count(),
            "resolved": Report.objects.filter(status=Report.Status.RESOLVED).count(),
            "dismissed": Report.objects.filter(status=Report.Status.DISMISSED).count(),
        }

        if status_filter in dict(Report.Status.choices):
            qs = qs.filter(status=status_filter)

        paginator = ReportPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = ReportAdminSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data, counts=counts)


class AdminReportResolveView(APIView):
    """
    Resolve a report (dismiss, warn, or suspend).
    """

    permission_classes = [IsAdminUserOrStaff]

    def post(self, request, pk):
        try:
            report = Report.objects.select_related("target_user").get(pk=pk)
        except Report.DoesNotExist as err:
            raise NotFound({"detail": "Report not found.", "code": "report_not_found"}) from err

        serializer = ReportResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action = serializer.validated_data["action"]
        admin_notes = serializer.validated_data.get("admin_notes", "")

        report.action_taken = action
        report.admin_notes = admin_notes
        report.status = (
            Report.Status.DISMISSED
            if action == Report.ActionTaken.DISMISSED
            else Report.Status.RESOLVED
        )
        report.resolved_by = request.user
        report.resolved_at = timezone.now()
        report.save()

        # If action is suspend, suspend target tutor profile
        if action == Report.ActionTaken.SUSPENDED:
            tutor_profile = getattr(report.target_user, "tutor_profile", None)
            if tutor_profile:
                tutor_profile.suspended_at = timezone.now()
                tutor_profile.save(update_fields=["suspended_at"])
                Notification.objects.create(
                    user=report.target_user,
                    kind=Notification.Kind.ACCOUNT_SUSPENDED,
                    data={
                        "reason": admin_notes or "Account suspended following investigation.",
                        "path": "/dashboard",
                    },
                )

        return Response(ReportAdminSerializer(report).data)


class AdminReportSuspendTutorView(APIView):
    """
    One-click suspend accused tutor from report queue.
    """

    permission_classes = [IsAdminUserOrStaff]

    def post(self, request, pk):
        try:
            report = Report.objects.select_related("target_user").get(pk=pk)
        except Report.DoesNotExist as err:
            raise NotFound({"detail": "Report not found.", "code": "report_not_found"}) from err

        serializer = ReportSuspendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data["reason"]

        tutor_profile = getattr(report.target_user, "tutor_profile", None)
        if not tutor_profile:
            raise ValidationError({"detail": "Target user is not a tutor.", "code": "not_a_tutor"})

        tutor_profile.suspended_at = timezone.now()
        tutor_profile.save(update_fields=["suspended_at"])

        report.status = Report.Status.RESOLVED
        report.action_taken = Report.ActionTaken.SUSPENDED
        report.admin_notes = reason
        report.resolved_by = request.user
        report.resolved_at = timezone.now()
        report.save()

        Notification.objects.create(
            user=report.target_user,
            kind=Notification.Kind.ACCOUNT_SUSPENDED,
            data={"reason": reason, "path": "/dashboard"},
        )

        return Response(
            {
                "message": "Tutor has been suspended and report marked as resolved.",
                "report": ReportAdminSerializer(report).data,
            }
        )


class AdminReplacementListView(APIView):
    """
    List replacement requests for admin.
    """

    permission_classes = [IsAdminUserOrStaff]

    def get(self, request):
        status_filter = request.query_params.get("status")
        qs = ReplacementRequest.objects.select_related("guardian__user", "match__tutor__user")
        if status_filter in dict(ReplacementRequest.Status.choices):
            qs = qs.filter(status=status_filter)

        paginator = ReportPagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = ReplacementRequestAdminSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminReplacementResolveView(APIView):
    """
    Mark a replacement request as processed or rejected.
    """

    permission_classes = [IsAdminUserOrStaff]

    def post(self, request, pk):
        try:
            replacement = ReplacementRequest.objects.get(pk=pk)
        except ReplacementRequest.DoesNotExist as err:
            raise NotFound(
                {"detail": "Replacement request not found.", "code": "not_found"}
            ) from err

        serializer = ReplacementRequestResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        replacement.status = serializer.validated_data["status"]
        replacement.admin_notes = serializer.validated_data.get("admin_notes", "")
        replacement.resolved_by = request.user
        replacement.resolved_at = timezone.now()
        replacement.save()

        return Response(ReplacementRequestAdminSerializer(replacement).data)
