from django.utils import timezone
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.generics import ListAPIView, get_object_or_404
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer


class NotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50

    def get_paginated_response(self, data):
        response = super().get_paginated_response(data)
        # the bell needs this on every list call; it counts all pages, not just this one
        response.data["unread_count"] = Notification.objects.filter(
            user=self.request.user, read_at__isnull=True
        ).count()
        return response


def mine(request):
    return Notification.objects.filter(user=request.user)


class NotificationListView(ListAPIView):
    """My notifications, newest first, with the total of unread ones."""

    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    pagination_class = NotificationPagination

    def get_queryset(self):
        return mine(self.request)

    @extend_schema(tags=["notifications"], summary="My notifications")
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class UnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["notifications"],
        summary="How many notifications I have not read (for the bell)",
        responses=inline_serializer("UnreadCount", {"unread_count": serializers.IntegerField()}),
    )
    def get(self, request):
        return Response({"unread_count": mine(request).filter(read_at__isnull=True).count()})


class MarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["notifications"],
        summary="Mark one notification as read",
        request=None,
        responses=NotificationSerializer,
    )
    def post(self, request, pk):
        # someone else's notification is a plain 404, as if it did not exist
        notification = get_object_or_404(mine(request), pk=pk)
        if notification.read_at is None:
            notification.read_at = timezone.now()
            notification.save(update_fields=["read_at"])
        return Response(NotificationSerializer(notification).data)


class MarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["notifications"],
        summary="Mark all my notifications as read",
        request=None,
        responses=inline_serializer("MarkedRead", {"updated": serializers.IntegerField()}),
    )
    def post(self, request):
        updated = mine(request).filter(read_at__isnull=True).update(read_at=timezone.now())
        return Response({"updated": updated})
