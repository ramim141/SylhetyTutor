from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny

from .filters import SORT_ORDERINGS, TutorFilterSet
from .models import TutorProfile
from .serializers import TutorCardSerializer


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
        return (
            TutorProfile.objects.filter(
                verification_status=TutorProfile.VerificationStatus.APPROVED,
                user__is_active=True,
            )
            .select_related("user", "university")
            .prefetch_related("subjects", "class_levels", "areas")
            .order_by(*SORT_ORDERINGS["featured"])
        )

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
