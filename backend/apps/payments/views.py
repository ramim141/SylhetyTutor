from django.conf import settings
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.exceptions import APIException, ErrorDetail, NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsTutor
from apps.matching.models import TutorApplication

from . import services
from .models import Payment
from .serializers import MyPaymentSerializer, PaymentSubmitSerializer
from .throttles import PaymentSubmitThrottle


class PaymentFailed(APIException):
    """A PaymentError as an API error: same `code` and `status`."""

    def __init__(self, error):
        self.status_code = error.status
        super().__init__(detail={"detail": ErrorDetail(str(error), error.code)})


def payment_info():
    return {
        **services.gateway.instructions(),
        "unlock_fee_enabled": settings.UNLOCK_FEE_ENABLED,
        "unlock_fee": settings.UNLOCK_FEE_AMOUNT,
        "commission_amount": settings.COMMISSION_AMOUNT,
        "commission_due_days": settings.COMMISSION_DUE_DAYS,
    }


def inline_info_serializer():
    return inline_serializer(
        "PaymentInfo",
        {
            "method": serializers.CharField(),
            "number": serializers.CharField(),
            "kind": serializers.CharField(),
            "unlock_fee_enabled": serializers.BooleanField(),
            "unlock_fee": serializers.IntegerField(),
            "commission_amount": serializers.IntegerField(),
            "commission_due_days": serializers.IntegerField(),
        },
    )


class PayUnlockView(APIView):
    """The tutor pays the unlock fee for a booked demo (only while the fee switch is on)."""

    permission_classes = [IsTutor]

    def get_throttles(self):
        return [PaymentSubmitThrottle()]

    @extend_schema(
        request=PaymentSubmitSerializer, responses=MyPaymentSerializer, tags=["payments"]
    )
    def post(self, request, pk):
        try:
            application = TutorApplication.objects.select_related(
                "tutor__user", "match", "match__requirement"
            ).get(pk=pk, tutor__user=request.user)
        except TutorApplication.DoesNotExist:
            raise NotFound() from None
        serializer = PaymentSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payment = services.submit_unlock(application, request.user, **serializer.validated_data)
        except services.PaymentError as error:
            raise PaymentFailed(error) from None
        return Response(MyPaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


class PaymentInfoView(APIView):
    permission_classes = [IsTutor]

    @extend_schema(responses=inline_info_serializer(), tags=["payments"])
    def get(self, request):
        return Response(payment_info())


class MyPaymentsView(APIView):
    permission_classes = [IsTutor]

    @extend_schema(responses=MyPaymentSerializer(many=True), tags=["payments"])
    def get(self, request):
        return Response(
            MyPaymentSerializer(
                Payment.objects.filter(user=request.user).order_by("-created_at"), many=True
            ).data
        )
