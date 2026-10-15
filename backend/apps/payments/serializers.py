from rest_framework import serializers

from .models import Payment


class PaymentSubmitSerializer(serializers.Serializer):
    transaction_id = serializers.CharField(max_length=40)
    sender_number = serializers.CharField(max_length=20)


class MyPaymentSerializer(serializers.ModelSerializer):
    """A tutor's own payment. Never anyone else's sender number."""

    class Meta:
        model = Payment
        fields = [
            "id",
            "purpose",
            "amount",
            "transaction_id",
            "status",
            "reject_reason",
            "created_at",
        ]
        read_only_fields = fields


class AdminPaymentSerializer(serializers.ModelSerializer):
    tutor_name = serializers.CharField(source="user.full_name")
    tutor_phone = serializers.CharField(source="user.phone")
    for_what = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id",
            "purpose",
            "amount",
            "method",
            "sender_number",
            "transaction_id",
            "status",
            "reject_reason",
            "created_at",
            "reviewed_at",
            "tutor_name",
            "tutor_phone",
            "for_what",
        ]
        read_only_fields = fields

    def get_for_what(self, obj) -> str:
        if obj.match_id:
            return f"{obj.match.requirement.area_id and obj.match.requirement.area.name_en} · demo"
        return ""
