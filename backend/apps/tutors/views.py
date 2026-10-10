from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import TutorProfile
from .serializers import TutorCardSerializer


class TutorListView(APIView):
    """
    Returns list of active tutors for the homepage and directory.
    Filterable by area, subject, gender, and search keyword.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        tags=["tutors"],
        summary="List tutors for homepage & directory",
        parameters=[
            OpenApiParameter("area", str, description="Filter by area slug or name"),
            OpenApiParameter("subject", str, description="Filter by subject slug or name"),
            OpenApiParameter("search", str, description="Search by tutor name or subject"),
        ],
        responses={200: TutorCardSerializer(many=True)},
    )
    def get(self, request):
        queryset = (
            TutorProfile.objects.filter(
                verification_status=TutorProfile.VerificationStatus.APPROVED,
                user__is_active=True,
            )
            .select_related("user", "university")
            .prefetch_related("subjects", "class_levels", "areas")
            .order_by("-is_featured", "-rating_avg", "-created_at")
        )

        search_query = request.query_params.get("search", "").strip()
        if search_query:
            queryset = (
                queryset.filter(user__full_name__icontains=search_query)
                | queryset.filter(subjects__name_en__icontains=search_query)
                | queryset.filter(areas__name_en__icontains=search_query)
            )
            queryset = queryset.distinct()

        area_param = request.query_params.get("area", "").strip()
        if area_param:
            queryset = queryset.filter(areas__slug=area_param) | queryset.filter(
                areas__name_en__icontains=area_param
            )
            queryset = queryset.distinct()

        serializer = TutorCardSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data)
