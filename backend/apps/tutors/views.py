from django.core.cache import cache
from django.db import transaction
from django.http import Http404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import serializers, status
from rest_framework.exceptions import ErrorDetail
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsTutor
from apps.accounts.throttles import DocumentUploadThrottle

from . import review
from .documents import DOCUMENT_FIELDS, clean_document_image, document_response, private_storage
from .exceptions import AlreadySubmitted, ProfileLocked
from .filters import SORT_ORDERINGS, TutorFilterSet
from .models import TutorProfile
from .serializers import (
    IDENTITY_FIELDS,
    TutorCardSerializer,
    TutorMeSerializer,
    TutorMeUpdateSerializer,
    TutorPublicSerializer,
)


class TutorPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50


class TutorListView(ListAPIView):
    """
    Public search over verified tutors (home page and the tutor directory).

    Only ``approved`` tutors with an active account appear. Cards never include a
    phone number or address (Architecture Doc §8.8).
    """

    permission_classes = [AllowAny]
    serializer_class = TutorCardSerializer
    pagination_class = TutorPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = TutorFilterSet

    def get_queryset(self):
        qs = (
            TutorProfile.objects.filter(
                verification_status=TutorProfile.VerificationStatus.APPROVED,
                user__is_active=True,
            )
            .select_related("user", "university")
            .prefetch_related("subjects", "class_levels", "areas")
            .order_by(*SORT_ORDERINGS["featured"])
        )
        if (
            self.request.user.is_authenticated
            and getattr(self.request.user, "role", None) == "tutor"
        ):
            qs = qs.exclude(user=self.request.user)
        return qs

    @extend_schema(
        tags=["tutors"],
        summary="Search verified tutors",
        parameters=[
            OpenApiParameter("area", str, description="Area slug, e.g. `amberkhana`"),
            OpenApiParameter("subject", str, description="Subject slug, e.g. `physics`"),
            OpenApiParameter("class_level", str, description="Class level slug, e.g. `hsc`"),
            OpenApiParameter("university", str, description="University slug, e.g. `sust`"),
            OpenApiParameter("gender", str, enum=["male", "female"]),
            OpenApiParameter(
                "fee_min", int, description="Budget floor (BDT/month); tutors whose range overlaps"
            ),
            OpenApiParameter(
                "fee_max",
                int,
                description="Budget ceiling (BDT/month); tutors whose range overlaps",
            ),
            OpenApiParameter(
                "q", str, description="Free text: name, department, bio, subject, area"
            ),
            OpenApiParameter(
                "sort",
                str,
                enum=list(SORT_ORDERINGS),
                description="`featured` (default), `rating` or `newest`",
            ),
            OpenApiParameter("page", int),
            OpenApiParameter("page_size", int, description="Default 20, maximum 50"),
        ],
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class TutorFeaturedView(APIView):
    """
    Top & featured tutors for homepage preview (Architecture Doc §4.2, Sprint 7).
    Returns top 6 approved tutors, cached for 15 minutes.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        cache_key = "tutors:featured:v1"
        data = cache.get(cache_key)
        if data is None:
            tutors = (
                TutorProfile.objects.filter(
                    verification_status=TutorProfile.VerificationStatus.APPROVED,
                    user__is_active=True,
                )
                .select_related("user", "university")
                .prefetch_related("subjects", "class_levels", "areas")
                .order_by(*SORT_ORDERINGS["featured"])[:6]
            )
            serializer = TutorCardSerializer(tutors, many=True)
            data = serializer.data
            cache.set(cache_key, data, timeout=900)
        return Response(data)


class TutorDetailView(RetrieveAPIView):
    """A tutor's public page. Only verified tutors with an active account have one."""

    permission_classes = [AllowAny]
    serializer_class = TutorPublicSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return (
            TutorProfile.objects.filter(
                verification_status=TutorProfile.VerificationStatus.APPROVED,
                user__is_active=True,
            )
            .select_related("user", "university")
            .prefetch_related("subjects", "class_levels", "areas", "availability")
        )

    @extend_schema(
        tags=["tutors"],
        summary="A tutor's public profile",
        description=(
            "No phone, email, address, student-ID number or documents: contact opens only "
            "after a booked demo (Architecture Doc §8.8). Anything not public answers 404."
        ),
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


def own_profile(user):
    """The signed-in tutor's profile; it is created empty (a draft) the first time it is needed."""
    profile, _ = TutorProfile.objects.get_or_create(user=user)
    return profile


def _locked(field):
    return serializers.ValidationError(
        {field: [ErrorDetail("Verified details can only be changed by an admin.", code="locked")]}
    )


class TutorMeView(APIView):
    """The tutor's own profile: read it, and save it step by step while it is a draft."""

    permission_classes = [IsTutor]

    @extend_schema(tags=["tutors"], summary="My tutor profile", responses={200: TutorMeSerializer})
    def get(self, request):
        return Response(TutorMeSerializer(own_profile(request.user)).data)

    @extend_schema(
        tags=["tutors"],
        summary="Save any part of my profile (draft)",
        description=(
            "Send only the fields you want to change. Allowed while the profile is a draft "
            "or was rejected. While it is under review (`pending`) the answer is 409 "
            "`profile_locked`. After approval only bio, fees, subjects, classes, areas and "
            "availability can change; identity fields answer 400 `locked`."
        ),
        request=TutorMeUpdateSerializer,
        responses={200: TutorMeSerializer},
    )
    def patch(self, request):
        profile = own_profile(request.user)
        if profile.verification_status == TutorProfile.VerificationStatus.PENDING:
            raise ProfileLocked()
        if profile.verification_status == TutorProfile.VerificationStatus.APPROVED:
            for field in IDENTITY_FIELDS:
                if field in request.data:
                    raise _locked(field)

        serializer = TutorMeUpdateSerializer(
            data=request.data, context={"profile": profile, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        profile.refresh_from_db()
        return Response(TutorMeSerializer(profile).data)


class TutorSubmitView(APIView):
    """Send the finished profile to an admin for verification."""

    permission_classes = [IsTutor]

    @extend_schema(
        tags=["tutors"],
        summary="Submit my profile for verification",
        description=(
            "Answers 400 with one `required` error per missing field if the profile is "
            "incomplete, and 409 `already_submitted` if it is already pending or approved."
        ),
        request=None,
        responses={200: TutorMeSerializer},
    )
    def post(self, request):
        profile = own_profile(request.user)
        if profile.verification_status in (
            TutorProfile.VerificationStatus.PENDING,
            TutorProfile.VerificationStatus.APPROVED,
        ):
            raise AlreadySubmitted()

        missing = profile.missing_fields()
        if missing:
            raise serializers.ValidationError(
                {
                    name: [ErrorDetail("This field is required.", code="required")]
                    for name in missing
                }
            )

        profile.verification_status = TutorProfile.VerificationStatus.PENDING
        profile.submitted_at = timezone.now()
        profile.rejection_reason = ""
        profile.save(update_fields=["verification_status", "submitted_at", "rejection_reason"])
        review.record_submission(profile, request.user)
        return Response(TutorMeSerializer(profile).data, status=status.HTTP_200_OK)


def _editable_documents(profile):
    """Documents change only while the profile is a draft or was rejected."""
    if profile.verification_status == TutorProfile.VerificationStatus.PENDING:
        raise ProfileLocked()
    if profile.verification_status == TutorProfile.VerificationStatus.APPROVED:
        raise _locked("file")


class TutorDocumentView(APIView):
    """Upload (or remove) my NID or student-ID photo."""

    permission_classes = [IsTutor]
    throttle_classes = [DocumentUploadThrottle]
    parser_classes = [MultiPartParser]

    def _field(self, kind):
        field = DOCUMENT_FIELDS.get(kind)
        if not field:
            raise Http404
        return field

    @extend_schema(
        tags=["tutors"],
        summary="Upload my NID or student-ID photo",
        description=(
            "`kind` is `nid` or `student_id`. Multipart form with one `file` (JPEG, PNG or "
            "WebP, at most 5 MB). The stored copy is re-encoded as JPEG without EXIF. Replaces "
            "an earlier upload. Locked while pending (409) and after approval (400 `locked`). "
            "Errors on `file`: `required`, `file_too_large`, `not_an_image`, "
            "`unsupported_format`, `image_too_large`."
        ),
        request={
            "multipart/form-data": {
                "type": "object",
                "properties": {"file": {"type": "string", "format": "binary"}},
            }
        },
        responses={200: TutorMeSerializer},
    )
    def put(self, request, kind):
        field = self._field(kind)
        profile = own_profile(request.user)
        _editable_documents(profile)
        content = clean_document_image(request.FILES.get("file"))

        old_name = getattr(profile, field).name
        with transaction.atomic():
            getattr(profile, field).save("document.jpg", content, save=False)
            profile.save(update_fields=[field, "updated_at"])
        if old_name:
            private_storage.delete(old_name)
        return Response(TutorMeSerializer(profile).data)

    @extend_schema(
        tags=["tutors"],
        summary="Remove my NID or student-ID photo",
        responses={200: TutorMeSerializer},
    )
    def delete(self, request, kind):
        field = self._field(kind)
        profile = own_profile(request.user)
        _editable_documents(profile)

        old_name = getattr(profile, field).name
        setattr(profile, field, "")
        profile.save(update_fields=[field, "updated_at"])
        if old_name:
            private_storage.delete(old_name)
        return Response(TutorMeSerializer(profile).data)


class DocumentDownloadView(APIView):
    """
    One document, to its owner or an admin and nobody else. Anyone else gets the same 404
    as for a file that does not exist, so the endpoint reveals nothing about who has uploaded.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["tutors"],
        summary="Read a stored NID / student-ID photo (owner or admin)",
        responses={(200, "image/jpeg"): bytes},
    )
    def get(self, request, profile_id, kind):
        user = request.user
        is_admin = user.role == "admin" or user.is_staff
        profile = TutorProfile.objects.filter(pk=profile_id).select_related("user").first()
        if profile is None or not (is_admin or profile.user_id == user.pk):
            raise Http404
        response = document_response(profile, kind)
        if profile.user_id != user.pk:
            # the owner reading their own scan is not worth a row; an admin reading it is
            review.record_document_view(profile, user, kind)
        return response
