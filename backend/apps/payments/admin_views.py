"""Payment verification queue for admins: the same services the Django admin calls."""

from django.db.models import Count
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework.exceptions import APIException, ErrorDetail
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin

from . import services
from .models import Payment
from .serializers import AdminPaymentSerializer

QUEUE_STATUSES = [s.value for s in Payment.Status]


class AdminPaymentFailed(APIException):
    def __init__(self, error):
        self.status_code = error.status
        detail = {"detail": ErrorDetail(str(error), error.code)}
        if error.status == 400:
            detail = {"reason": [ErrorDetail(str(error), error.code)]}
        super().__init__(detail=detail)


def queue():
    return Payment.objects.select_related("user", "match__requirement__area")


class PaymentListView(APIView):
    """Pending first (oldest first, they have waited longest), with a count per status."""

    permission_classes = [IsAdmin]

    @extend_schema(
        parameters=[OpenApiParameter("status", str)],
        responses=inline_serializer(
            "AdminPaymentList",
            {
                "counts": serializers.DictField(child=serializers.IntegerField()),
                "results": AdminPaymentSerializer(many=True),
            },
        ),
        tags=["admin"],
    )
    def get(self, request):
        wanted = request.query_params.get("status", Payment.Status.PENDING)
        if wanted not in QUEUE_STATUSES:
            wanted = Payment.Status.PENDING
        counts = {s: 0 for s in QUEUE_STATUSES}
        counts.update(dict(Payment.objects.values_list("status").annotate(n=Count("id"))))
        rows = queue().filter(status=wanted)
        rows = rows.order_by("created_at" if wanted == Payment.Status.PENDING else "-created_at")
        return Response(
            {"counts": counts, "results": AdminPaymentSerializer(rows[:100], many=True).data}
        )


class PaymentDecisionView(APIView):
    permission_classes = [IsAdmin]
    action = None

    @extend_schema(request=None, responses=AdminPaymentSerializer, tags=["admin"])
    def post(self, request, pk):
        payment = get_object_or_404(queue(), pk=pk)
        try:
            if self.action == "verify":
                services.gateway.verify(payment, request.user)
            else:
                services.gateway.reject(payment, request.user, request.data.get("reason"))
        except services.PaymentError as error:
            raise AdminPaymentFailed(error) from None
        return Response(AdminPaymentSerializer(queue().get(pk=pk)).data)
