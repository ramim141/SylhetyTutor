from django.core.cache import cache
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Area, ClassLevel, Subject, University
from .serializers import (
    AreaSerializer,
    ClassLevelSerializer,
    LookupsGroupedSerializer,
    SubjectSerializer,
    UniversitySerializer,
)

LOOKUPS_CACHE_KEY = "lookups:grouped:v1"
LOOKUPS_CACHE_SECONDS = 60 * 60  # signals clear it on every save/delete, so this is only a ceiling


class LookupsGroupedView(APIView):
    """
    Returns all active reference lookups (areas, subjects, class levels, universities)
    in a single grouped response for fast frontend prefetching and caching.
    """

    permission_classes = [AllowAny]

    @extend_schema(
        tags=["lookups"],
        summary="Get all reference lookup data",
        description=(
            "Returns Sylhet areas, subjects, class levels, and universities in a single payload."
        ),
        responses={200: LookupsGroupedSerializer},
    )
    def get(self, request):
        payload = cache.get(LOOKUPS_CACHE_KEY)
        if payload is None:
            data = {
                "areas": Area.objects.filter(is_active=True).order_by("sort_order", "name_en"),
                "subjects": Subject.objects.filter(is_active=True).order_by(
                    "sort_order", "name_en"
                ),
                "class_levels": ClassLevel.objects.filter(is_active=True).order_by(
                    "sort_order", "name_en"
                ),
                "universities": University.objects.filter(is_active=True).order_by(
                    "sort_order", "name_en"
                ),
            }
            payload = LookupsGroupedSerializer(data).data
            cache.set(LOOKUPS_CACHE_KEY, payload, LOOKUPS_CACHE_SECONDS)
        return Response(payload)


class AreaListView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["lookups"],
        summary="List active Sylhet areas",
        responses={200: AreaSerializer(many=True)},
    )
    def get(self, request):
        areas = Area.objects.filter(is_active=True).order_by("sort_order", "name_en")
        return Response(AreaSerializer(areas, many=True).data)


class SubjectListView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["lookups"],
        summary="List active tuition subjects",
        responses={200: SubjectSerializer(many=True)},
    )
    def get(self, request):
        subjects = Subject.objects.filter(is_active=True).order_by("sort_order", "name_en")
        return Response(SubjectSerializer(subjects, many=True).data)


class ClassLevelListView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["lookups"],
        summary="List active class levels",
        responses={200: ClassLevelSerializer(many=True)},
    )
    def get(self, request):
        class_levels = ClassLevel.objects.filter(is_active=True).order_by("sort_order", "name_en")
        return Response(ClassLevelSerializer(class_levels, many=True).data)


class UniversityListView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["lookups"],
        summary="List active universities",
        responses={200: UniversitySerializer(many=True)},
    )
    def get(self, request):
        universities = University.objects.filter(is_active=True).order_by("sort_order", "name_en")
        return Response(UniversitySerializer(universities, many=True).data)
