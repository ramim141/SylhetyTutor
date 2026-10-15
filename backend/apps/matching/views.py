from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import APIException, ErrorDetail
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsApprovedTutor, IsTutor

from . import services
from .models import TutorApplication
from .serializers import ApplyWriteSerializer, TutorApplicationSerializer
from .throttles import ApplicationCreateThrottle


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
