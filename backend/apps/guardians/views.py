from django.conf import settings
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.exceptions import APIException, ErrorDetail, NotFound
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsApprovedTutor, IsGuardianOrAdmin

from . import services
from .matching import matching_requirements
from .models import GuardianProfile, Requirement
from .serializers import (
    CloseSerializer,
    MatchingRequirementSerializer,
    RequirementSerializer,
    RequirementWriteSerializer,
)
from .throttles import RequirementCreateThrottle

Status = Requirement.Status


class RequirementFailed(APIException):
    """A RequirementError as an API error: same `code`, `status` and `fields`."""

    def __init__(self, error):
        self.status_code = error.status
        detail = {"detail": ErrorDetail(str(error), error.code)}
        for name in error.fields:
            detail[name] = [ErrorDetail("This field is required.", "required")]
        super().__init__(detail=detail)


def guardian_of(request):
    profile, _ = GuardianProfile.objects.get_or_create(user=request.user)
    return profile


def own_requirement(request, pk):
    """A guardian only ever reaches their own requirements; anything else is a plain 404."""
    try:
        return (
            guardian_of(request)
            .requirements.select_related("class_level", "area")
            .prefetch_related("subjects")
            .get(pk=pk)
        )
    except Requirement.DoesNotExist:
        raise NotFound() from None


def refreshed(requirement):
    return Requirement.objects.select_related("class_level", "area").get(pk=requirement.pk)


class GuardianMeSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    full_name = serializers.CharField()
    phone_verified = serializers.BooleanField()
    open_count = serializers.IntegerField()
    draft_count = serializers.IntegerField()
    max_open = serializers.IntegerField()
    max_drafts = serializers.IntegerField()


class GuardianMeView(APIView):
    permission_classes = [IsGuardianOrAdmin]

    @extend_schema(responses=GuardianMeSerializer, tags=["guardians"])
    def get(self, request):
        profile = guardian_of(request)
        return Response(
            {
                "id": profile.id,
                "full_name": request.user.full_name,
                "phone_verified": profile.phone_verified,
                "open_count": services.open_count(profile),
                "draft_count": profile.requirements.filter(status=Status.DRAFT).count(),
                "max_open": settings.MAX_OPEN_REQUIREMENTS,
                "max_drafts": settings.MAX_DRAFT_REQUIREMENTS,
            }
        )


class RequirementListView(APIView):
    permission_classes = [IsGuardianOrAdmin]

    def get_throttles(self):
        return [RequirementCreateThrottle()] if self.request.method == "POST" else []

    @extend_schema(responses=RequirementSerializer(many=True), tags=["requirements"])
    def get(self, request):
        queryset = (
            guardian_of(request)
            .requirements.select_related("class_level", "area")
            .prefetch_related("subjects")
        )
        return Response(RequirementSerializer(queryset, many=True).data)

    @extend_schema(
        request=RequirementWriteSerializer, responses=RequirementSerializer, tags=["requirements"]
    )
    def post(self, request):
        serializer = RequirementWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            requirement = services.create_draft(guardian_of(request), **serializer.validated_data)
        except services.RequirementError as error:
            raise RequirementFailed(error) from None
        return Response(
            RequirementSerializer(refreshed(requirement)).data, status=status.HTTP_201_CREATED
        )


class RequirementDetailView(APIView):
    permission_classes = [IsGuardianOrAdmin]

    @extend_schema(responses=RequirementSerializer, tags=["requirements"])
    def get(self, request, pk):
        return Response(RequirementSerializer(own_requirement(request, pk)).data)

    @extend_schema(
        request=RequirementWriteSerializer, responses=RequirementSerializer, tags=["requirements"]
    )
    def patch(self, request, pk):
        requirement = own_requirement(request, pk)
        if requirement.status != Status.DRAFT:
            raise RequirementFailed(
                services.RequirementError("not_draft", "Only a draft can be edited.")
            )
        serializer = RequirementWriteSerializer(requirement, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(RequirementSerializer(refreshed(requirement)).data)

    @extend_schema(responses={204: None}, tags=["requirements"])
    def delete(self, request, pk):
        requirement = own_requirement(request, pk)
        if requirement.status == Status.OPEN:
            raise RequirementFailed(
                services.RequirementError("use_close", "Close an open requirement instead.")
            )
        if requirement.status != Status.DRAFT:
            raise RequirementFailed(
                services.RequirementError("not_draft", "Only a draft can be deleted.")
            )
        requirement.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RequirementPublishView(APIView):
    permission_classes = [IsGuardianOrAdmin]

    @extend_schema(request=None, responses=RequirementSerializer, tags=["requirements"])
    def post(self, request, pk):
        requirement = own_requirement(request, pk)
        try:
            requirement = services.publish(requirement)
        except services.RequirementError as error:
            raise RequirementFailed(error) from None
        return Response(RequirementSerializer(refreshed(requirement)).data)


class RequirementCloseView(APIView):
    permission_classes = [IsGuardianOrAdmin]

    @extend_schema(request=CloseSerializer, responses=RequirementSerializer, tags=["requirements"])
    def post(self, request, pk):
        requirement = own_requirement(request, pk)
        serializer = CloseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            requirement = services.close(requirement, serializer.validated_data.get("reason", ""))
        except services.RequirementError as error:
            raise RequirementFailed(error) from None
        return Response(RequirementSerializer(refreshed(requirement)).data)


class MatchingListView(ListAPIView):
    """Open requirements that suit the signed-in, approved tutor."""

    permission_classes = [IsApprovedTutor]
    serializer_class = MatchingRequirementSerializer

    def get_queryset(self):
        return matching_requirements(self.request.user.tutor_profile)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        profile = self.request.user.tutor_profile
        context["profile"] = profile
        context["applications"] = dict(profile.applications.values_list("requirement_id", "status"))
        return context

    @extend_schema(tags=["requirements"])
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class MatchingDetailView(RetrieveAPIView):
    permission_classes = [IsApprovedTutor]
    serializer_class = MatchingRequirementSerializer

    def get_queryset(self):
        return matching_requirements(self.request.user.tutor_profile)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        profile = self.request.user.tutor_profile
        context["profile"] = profile
        context["applications"] = dict(profile.applications.values_list("requirement_id", "status"))
        return context

    @extend_schema(tags=["requirements"])
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
