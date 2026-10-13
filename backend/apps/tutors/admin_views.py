"""
Verification queue for admins (Sprint_4.md). The decisions themselves live in review.py, the
same service the Django admin actions call, so the rules cannot drift apart.
"""

from django.db.models import Count, Q
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import serializers, status
from rest_framework.exceptions import APIException, ErrorDetail
from rest_framework.generics import ListAPIView, get_object_or_404
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin

from . import review
from .models import TutorProfile, VerificationEvent
from .serializers import (
    AvailabilitySlotSerializer,
    LookupNameSerializer,
    UniversityNameSerializer,
)

Status = TutorProfile.VerificationStatus
QUEUE_STATUSES = (Status.PENDING, Status.APPROVED, Status.REJECTED)  # never drafts


def queue():
    """Profiles an admin may see: everything that was submitted. A draft is the tutor's own."""
    return TutorProfile.objects.filter(verification_status__in=QUEUE_STATUSES).select_related(
        "user", "university"
    )


class ReviewFailed(APIException):
    """A ReviewError as an API error: same `code`, `status` and (for incomplete) `fields`."""

    def __init__(self, error):
        self.status_code = error.status
        detail = {"detail": ErrorDetail(str(error), error.code)}
        if error.status == 400:
            detail = {"reason": [ErrorDetail(str(error), error.code)]}
        for name in error.fields:
            detail[name] = [ErrorDetail("This field is required.", "required")]
        super().__init__(detail=detail)


class ApprovalListSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(read_only=True)
    full_name = serializers.CharField(source="user.full_name")
    university = serializers.CharField(source="university.short_name", default=None)
    status = serializers.CharField(source="verification_status")
    areas = serializers.SlugRelatedField(many=True, slug_field="slug", read_only=True)
    has_all_documents = serializers.SerializerMethodField()

    class Meta:
        model = TutorProfile
        fields = [
            "id",
            "full_name",
            "university",
            "department",
            "status",
            "submitted_at",
            "fee_min",
            "fee_max",
            "areas",
            "has_all_documents",
        ]
        read_only_fields = fields

    def get_has_all_documents(self, obj) -> bool:
        return bool(obj.nid_photo and obj.student_id_photo)


class ApprovalPagination(PageNumberPagination):
    page_size = 20

    def get_paginated_response(self, data):
        response = super().get_paginated_response(data)
        # tab numbers: always all three, whatever tab is open
        totals = queue().aggregate(
            **{s.value: Count("pk", filter=Q(verification_status=s)) for s in QUEUE_STATUSES}
        )
        response.data["counts"] = totals
        return response


class ApprovalListView(ListAPIView):
    """Submitted profiles, oldest submission first so nobody waits behind a latecomer."""

    permission_classes = [IsAdmin]
    serializer_class = ApprovalListSerializer
    pagination_class = ApprovalPagination

    def get_queryset(self):
        wanted = self.request.query_params.get("status", Status.PENDING)
        if wanted not in QUEUE_STATUSES:
            raise serializers.ValidationError(
                {"status": [ErrorDetail("Unknown status.", "invalid_choice")]}
            )
        return (
            queue()
            .filter(verification_status=wanted)
            .prefetch_related("areas")
            .order_by("submitted_at", "pk")
        )

    @extend_schema(
        tags=["admin"],
        summary="Verification queue (admin)",
        parameters=[OpenApiParameter("status", enum=[s.value for s in QUEUE_STATUSES])],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class ApprovalDetailSerializer(serializers.ModelSerializer):
    """Everything an admin needs to decide. Phone and email are fine here: this is verification."""

    status = serializers.CharField(source="verification_status")
    user = serializers.SerializerMethodField()
    profile = serializers.SerializerMethodField()
    documents = serializers.SerializerMethodField()
    missing_fields = serializers.SerializerMethodField()
    can_approve = serializers.SerializerMethodField()
    history = serializers.SerializerMethodField()

    class Meta:
        model = TutorProfile
        fields = [
            "id",
            "status",
            "submitted_at",
            "rejection_reason",
            "user",
            "profile",
            "documents",
            "missing_fields",
            "can_approve",
            "history",
        ]
        read_only_fields = fields

    def get_user(self, obj) -> dict:
        user = obj.user
        return {"full_name": user.full_name, "phone": user.phone, "email": user.email}

    def get_profile(self, obj) -> dict:
        return {
            "gender": obj.gender,
            "university": UniversityNameSerializer(obj.university).data if obj.university else None,
            "department": obj.department,
            "year": obj.year,
            "student_id_number": obj.student_id_number,
            "bio": obj.bio,
            "fee_min": obj.fee_min,
            "fee_max": obj.fee_max,
            "subjects": LookupNameSerializer(obj.subjects.all(), many=True).data,
            "class_levels": LookupNameSerializer(obj.class_levels.all(), many=True).data,
            "areas": LookupNameSerializer(obj.areas.all(), many=True).data,
            "availability": AvailabilitySlotSerializer(obj.availability.all(), many=True).data,
        }

    def get_documents(self, obj) -> list:
        return [
            {"kind": kind, "url": f"/api/v1/tutors/documents/{obj.pk}/{kind}/"}
            for kind, stored in (("nid", obj.nid_photo), ("student_id", obj.student_id_photo))
            if stored
        ]

    def get_missing_fields(self, obj) -> list:
        return [name for name in obj.missing_fields() if name in obj.REQUIRED_FIELDS]

    def get_can_approve(self, obj) -> bool:
        request = self.context.get("request")
        return (
            obj.verification_status == Status.PENDING
            and not self.get_missing_fields(obj)
            and (request is None or request.user.pk != obj.user_id)
        )

    def get_history(self, obj) -> list:
        # who looked at a document is for the audit log, not for the queue page
        events = obj.verification_events.exclude(
            action=VerificationEvent.Action.DOCUMENT_VIEWED
        ).select_related("actor")
        return [
            {
                "action": e.action,
                "actor": e.actor.full_name if e.actor else None,
                "reason": e.reason,
                "at": e.created_at,
            }
            for e in events
        ]


def detail_response(request, profile):
    return ApprovalDetailSerializer(profile, context={"request": request}).data


class ApprovalDetailView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(
        tags=["admin"], summary="One submitted profile (admin)", responses=ApprovalDetailSerializer
    )
    def get(self, request, profile_id):
        profile = get_object_or_404(queue(), pk=profile_id)
        return Response(detail_response(request, profile))


class ApproveView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(
        tags=["admin"],
        summary="Approve a pending profile",
        description="409 `not_pending`, 409 `incomplete_profile`, 403 `self_approval`.",
        request=None,
        responses=ApprovalDetailSerializer,
    )
    def post(self, request, profile_id):
        profile = get_object_or_404(queue(), pk=profile_id)
        try:
            profile = review.approve(profile, request.user)
        except review.ReviewError as exc:
            raise ReviewFailed(exc) from exc
        return Response(detail_response(request, profile), status=status.HTTP_200_OK)


class RejectSerializer(serializers.Serializer):
    reason = serializers.CharField(allow_blank=True, trim_whitespace=False)


class RejectView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(
        tags=["admin"],
        summary="Reject a profile with a reason the tutor will read",
        description=(
            "`reason` is 10–500 characters (400 `required` / `too_short` / `too_long`). "
            "409 `not_pending`, 403 `self_approval`."
        ),
        request=RejectSerializer,
        responses=ApprovalDetailSerializer,
    )
    def post(self, request, profile_id):
        profile = get_object_or_404(queue(), pk=profile_id)
        body = RejectSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        try:
            profile = review.reject(profile, request.user, body.validated_data["reason"])
        except review.ReviewError as exc:
            raise ReviewFailed(exc) from exc
        return Response(detail_response(request, profile), status=status.HTTP_200_OK)
