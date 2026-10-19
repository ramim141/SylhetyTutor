"""
Views for reviews (Sprint 7).
"""

from rest_framework import permissions, status
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.matching.models import Match
from apps.notifications.models import Notification
from apps.tutors.models import TutorProfile
from config.exceptions import ConflictError

from .models import Review
from .serializers import (
    GuardianReviewStatusSerializer,
    ReviewCreateSerializer,
    ReviewSerializer,
)


class ReviewSubmitThrottle(UserRateThrottle):
    rate = "10/hour"


class ReviewPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


class TutorReviewListView(ListAPIView):
    """Public list of reviews for an approved tutor."""

    permission_classes = [permissions.AllowAny]
    serializer_class = ReviewSerializer
    pagination_class = ReviewPagination

    def get_queryset(self):
        slug = self.kwargs.get("slug")
        try:
            tutor = TutorProfile.objects.get(
                slug=slug, verification_status=TutorProfile.VerificationStatus.APPROVED
            )
        except TutorProfile.DoesNotExist as err:
            raise NotFound(
                {"detail": "Tutor profile not found.", "code": "tutor_not_found"}
            ) from err
        return Review.objects.filter(tutor=tutor).select_related("guardian__user")


class TutorReviewCreateView(APIView):
    """
    Submit a review for an approved tutor.
    Only guardians who have a confirmed match with this tutor can review.
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ReviewSubmitThrottle]

    def post(self, request, slug):
        if request.user.role != "guardian":
            raise PermissionDenied("Only guardians can submit reviews.", code="only_guardian")

        try:
            tutor = TutorProfile.objects.get(
                slug=slug, verification_status=TutorProfile.VerificationStatus.APPROVED
            )
        except TutorProfile.DoesNotExist as err:
            raise NotFound(
                {"detail": "Tutor profile not found.", "code": "tutor_not_found"}
            ) from err

        guardian = getattr(request.user, "guardian_profile", None)
        if not guardian:
            raise PermissionDenied(
                {"detail": "Guardian profile required.", "code": "guardian_profile_required"}
            )

        match = Match.objects.filter(
            tutor=tutor,
            requirement__guardian=guardian,
            status=Match.Status.CONFIRMED,
        ).first()

        if not match:
            raise ConflictError(
                "You can only review a tutor after a confirmed tuition match.",
                code="no_confirmed_match",
            )

        if Review.objects.filter(tutor=tutor, guardian=guardian).exists():
            raise ConflictError(
                "You have already reviewed this tutor.",
                code="already_reviewed",
            )

        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        review = Review.objects.create(
            tutor=tutor,
            guardian=guardian,
            match=match,
            rating=serializer.validated_data["rating"],
            comment=serializer.validated_data.get("comment", ""),
        )

        # Notify tutor
        Notification.objects.create(
            user=tutor.user,
            kind=Notification.Kind.REVIEW_RECEIVED,
            data={"rating": review.rating, "path": f"/tutors/{tutor.slug}"},
        )

        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class GuardianReviewStatusView(APIView):
    """
    Check if the current guardian can review this tutor, or get their existing review.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, slug):
        if request.user.role != "guardian":
            return Response({"can_review": False, "has_reviewed": False, "review": None})

        try:
            tutor = TutorProfile.objects.get(
                slug=slug, verification_status=TutorProfile.VerificationStatus.APPROVED
            )
        except TutorProfile.DoesNotExist as err:
            raise NotFound(
                {"detail": "Tutor profile not found.", "code": "tutor_not_found"}
            ) from err

        guardian = getattr(request.user, "guardian_profile", None)
        if not guardian:
            return Response({"can_review": False, "has_reviewed": False, "review": None})

        existing_review = Review.objects.filter(tutor=tutor, guardian=guardian).first()
        has_confirmed_match = Match.objects.filter(
            tutor=tutor,
            requirement__guardian=guardian,
            status=Match.Status.CONFIRMED,
        ).exists()

        data = {
            "can_review": has_confirmed_match and (existing_review is None),
            "has_reviewed": existing_review is not None,
            "review": existing_review,
        }
        return Response(GuardianReviewStatusSerializer(data).data)
