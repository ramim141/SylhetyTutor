from django.utils import timezone
from rest_framework import serializers

from .models import Commission, Payment


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


class CommissionSerializer(serializers.ModelSerializer):
    """A tutor's commission. Which tuition it was for is shown by area and class only."""

    area = serializers.SerializerMethodField()
    demo_at = serializers.DateTimeField(source="match.demo_at")
    overdue = serializers.SerializerMethodField()
    payment = serializers.SerializerMethodField()

    class Meta:
        model = Commission
        fields = [
            "id",
            "amount",
            "due_date",
            "status",
            "note",
            "area",
            "demo_at",
            "overdue",
            "payment",
            "created_at",
        ]
        read_only_fields = fields

    def get_area(self, obj):
        area = obj.match.requirement.area
        return (
            {"slug": area.slug, "name_en": area.name_en, "name_bn": area.name_bn} if area else None
        )

    def get_overdue(self, obj) -> bool:
        return obj.status == Commission.Status.PENDING and obj.due_date < timezone.localdate()

    def get_payment(self, obj):
        latest = max(obj.payments.all(), key=lambda p: p.created_at, default=None)
        if latest is None:
            return None
        return {"status": latest.status, "reject_reason": latest.reject_reason}


class AdminCommissionSerializer(CommissionSerializer):
    tutor_name = serializers.CharField(source="tutor.user.full_name")
    tutor_phone = serializers.CharField(source="tutor.user.phone", default=None)
    suspended = serializers.SerializerMethodField()

    class Meta(CommissionSerializer.Meta):
        fields = [*CommissionSerializer.Meta.fields, "tutor_name", "tutor_phone", "suspended"]
        read_only_fields = fields

    def get_suspended(self, obj) -> bool:
        return bool(obj.tutor.suspended_at)
