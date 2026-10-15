"""The admin's call list: guardians who did not answer the confirmation link."""

from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.exceptions import APIException, ErrorDetail
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdmin

from . import confirmation, services
from .models import Match


class CallListSerializer(serializers.ModelSerializer):
    guardian_name = serializers.CharField(source="requirement.guardian.user.full_name")
    guardian_phone = serializers.CharField(source="requirement.guardian.user.phone", default=None)
    tutor_name = serializers.CharField(source="tutor.user.full_name")
    tutor_phone = serializers.CharField(source="tutor.user.phone", default=None)
    area = serializers.CharField(source="requirement.area.name_en", default="")
    whatsapp_url = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = [
            "id",
            "guardian_name",
            "guardian_phone",
            "tutor_name",
            "tutor_phone",
            "area",
            "demo_at",
            "confirmation_requested_at",
            "whatsapp_url",
        ]
        read_only_fields = fields

    def get_whatsapp_url(self, obj):
        phone = obj.requirement.guardian.user.phone
        return f"https://wa.me/88{phone}" if phone else None


class AnswerSerializer(serializers.Serializer):
    answer = serializers.ChoiceField(choices=["yes", "no"])
    channel = serializers.ChoiceField(choices=["call", "whatsapp"], default="call")


class CallListView(APIView):
    permission_classes = [IsAdmin]

    @extend_schema(responses=CallListSerializer(many=True), tags=["admin"])
    def get(self, request):
        return Response(CallListSerializer(confirmation.call_list(), many=True).data)


class CallAnswerView(APIView):
    """An admin records what the guardian said on the phone."""

    permission_classes = [IsAdmin]

    @extend_schema(request=AnswerSerializer, responses=CallListSerializer, tags=["admin"])
    def post(self, request, pk):
        match = get_object_or_404(confirmation.call_list(), pk=pk)
        serializer = AnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            confirmation.answer(
                match,
                serializer.validated_data["answer"] == "yes",
                serializer.validated_data["channel"],
            )
        except services.MatchingError as error:
            exc = APIException(detail={"detail": ErrorDetail(str(error), error.code)})
            exc.status_code = error.status
            raise exc from None
        return Response({"id": str(match.pk), "answered": True})
