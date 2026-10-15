from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import APIException, ErrorDetail, NotFound
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsApprovedTutor, IsGuardian, IsTutor
from apps.guardians.views import guardian_of, own_requirement

from . import confirmation, services
from .models import Match, TutorApplication
from .serializers import (
    ApplyWriteSerializer,
    BookDemoSerializer,
    ConfirmationAnswerSerializer,
    GuardianApplicationSerializer,
    PublicConfirmationSerializer,
    TutorApplicationSerializer,
)
from .throttles import ApplicationCreateThrottle, ConfirmLinkThrottle


class MatchingFailed(APIException):
    """A MatchingError as an API error: same `code` and `status`."""

    def __init__(self, error):
        self.status_code = error.status
        super().__init__(detail={"detail": ErrorDetail(str(error), error.code)})


class ApplyView(APIView):
    permission_classes = [IsApprovedTutor]

    def get_throttles(self):
        return [ApplicationCreateThrottle()]

    @extend_schema(
        request=ApplyWriteSerializer, responses=TutorApplicationSerializer, tags=["applications"]
    )
    def post(self, request, requirement_id):
        serializer = ApplyWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = request.user.tutor_profile
        try:
            application = services.apply(
                profile, requirement_id, serializer.validated_data.get("message", "")
            )
        except services.MatchingError as error:
            raise MatchingFailed(error) from None
        return Response(
            TutorApplicationSerializer(application, context={"profile": profile}).data,
            status=status.HTTP_201_CREATED,
        )


class MyApplicationsView(APIView):
    permission_classes = [IsTutor]

    @extend_schema(responses=TutorApplicationSerializer(many=True), tags=["applications"])
    def get(self, request):
        profile = getattr(request.user, "tutor_profile", None)
        if profile is None:
            return Response([])
        queryset = (
            TutorApplication.objects.filter(tutor=profile)
            .select_related("requirement__class_level", "requirement__area")
            .prefetch_related("requirement__subjects")
        )
        return Response(
            TutorApplicationSerializer(queryset, many=True, context={"profile": profile}).data
        )


def applicants_queryset(requirement):
    return requirement.applications.select_related(
        "tutor__user", "tutor__university"
    ).prefetch_related("tutor__subjects", "tutor__class_levels", "tutor__areas")


class RequirementApplicantsView(APIView):
    """The guardian's list of who applied. Opening it marks new applications as viewed."""

    permission_classes = [IsGuardian]

    @extend_schema(responses=GuardianApplicationSerializer(many=True), tags=["applications"])
    def get(self, request, pk):
        requirement = own_requirement(request, pk)
        services.mark_viewed(requirement)
        return Response(
            GuardianApplicationSerializer(applicants_queryset(requirement), many=True).data
        )


class ApplicationDecisionView(APIView):
    """Shortlist or reject one applicant; `action` is set by the URL."""

    permission_classes = [IsGuardian]
    action = None

    @extend_schema(request=None, responses=GuardianApplicationSerializer, tags=["applications"])
    def post(self, request, pk):
        application = own_application(request, pk)
        try:
            getattr(services, self.action)(application)
        except services.MatchingError as error:
            raise MatchingFailed(error) from None
        application = applicants_queryset(application.requirement).get(pk=pk)
        return Response(GuardianApplicationSerializer(application).data)


def own_application(request, pk):
    """A guardian only ever reaches applications on their own requirements; else a plain 404."""
    try:
        return TutorApplication.objects.select_related("requirement", "tutor__user").get(
            pk=pk, requirement__guardian=guardian_of(request)
        )
    except TutorApplication.DoesNotExist:
        raise NotFound() from None


class BookDemoView(APIView):
    """Pick the demo time for a shortlisted tutor. Contact opens for both sides (8.8)."""

    permission_classes = [IsGuardian]

    @extend_schema(
        request=BookDemoSerializer, responses=GuardianApplicationSerializer, tags=["applications"]
    )
    def post(self, request, pk):
        application = own_application(request, pk)
        serializer = BookDemoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            services.book_demo(application, serializer.validated_data["demo_at"], request.user)
        except services.MatchingError as error:
            raise MatchingFailed(error) from None
        application = applicants_queryset(application.requirement).get(pk=pk)
        return Response(GuardianApplicationSerializer(application).data)


class ConfirmationLinkView(APIView):
    """
    The guardian's one-tap page, reached from the emailed link. No login: the signed token in the
    URL is the proof. It shows only the tutor's name and the demo time.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get_throttles(self):
        return [ConfirmLinkThrottle()]

    @extend_schema(responses=PublicConfirmationSerializer, tags=["confirmation"])
    def get(self, request, token):
        try:
            match = confirmation.match_from_token(token)
        except services.MatchingError as error:
            raise MatchingFailed(error) from None
        return Response(PublicConfirmationSerializer(match).data)

    @extend_schema(
        request=ConfirmationAnswerSerializer,
        responses=PublicConfirmationSerializer,
        tags=["confirmation"],
    )
    def post(self, request, token):
        serializer = ConfirmationAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            match = confirmation.match_from_token(token)
            match = confirmation.answer(
                match, serializer.validated_data["answer"] == "yes", Match.Channel.LINK
            )
        except services.MatchingError as error:
            raise MatchingFailed(error) from None
        return Response(PublicConfirmationSerializer(match).data)
