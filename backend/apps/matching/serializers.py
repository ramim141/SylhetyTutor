from django.conf import settings
from rest_framework import serializers

from apps.guardians.serializers import MatchingRequirementSerializer
from apps.guardians.validators import contact_not_allowed
from apps.tutors.serializers import TutorCardSerializer

from . import services
from .models import TutorApplication


def demo_state(application):
    """(match, unlock) of an application; either may be None."""
    match = getattr(application, "match", None)
    unlock = getattr(match, "unlock", None) if match else None
    return match, unlock


class ContactSerializer(serializers.Serializer):
    name = serializers.CharField()
    phone = serializers.CharField(allow_null=True)
    email = serializers.CharField(allow_null=True)


class DemoFieldsMixin:
    """
    The demo time is visible to both sides once booked. The other side's contact is returned only
    when a ContactUnlock exists (Architecture Doc 8.8); `unlock_fee` tells the page that a booked
    demo is waiting for the fee instead.
    """

    def get_demo_at(self, obj):
        match, _ = demo_state(obj)
        return match.demo_at if match else None

    def get_unlock_fee(self, obj):
        match, unlock = demo_state(obj)
        if match and not unlock and services.unlock_fee_required():
            return settings.UNLOCK_FEE_AMOUNT
        return None

    def get_contact(self, obj):
        _, unlock = demo_state(obj)
        if not unlock:
            return None
        return ContactSerializer(services.contact_of(self.other_user(obj))).data


class ApplyWriteSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=300, required=False, allow_blank=True)

    def validate_message(self, value):
        return contact_not_allowed(value.strip())


class TutorApplicationSerializer(DemoFieldsMixin, serializers.ModelSerializer):
    """
    A tutor's own application. The requirement is the same allow-list a tutor already sees (no
    guardian name, phone or address).
    """

    requirement = serializers.SerializerMethodField()
    demo_at = serializers.SerializerMethodField()
    unlock_fee = serializers.SerializerMethodField()
    contact = serializers.SerializerMethodField()
    payment = serializers.SerializerMethodField()

    class Meta:
        model = TutorApplication
        fields = [
            "id",
            "status",
            "message",
            "created_at",
            "requirement",
            "demo_at",
            "unlock_fee",
            "contact",
            "payment",
        ]
        read_only_fields = fields

    @staticmethod
    def other_user(obj):
        return obj.requirement.guardian.user

    def get_payment(self, obj):
        """The tutor's latest unlock payment on this demo (shown instead of the Pay button)."""
        match, _ = demo_state(obj)
        if not match:
            return None
        latest = max(match.payments.all(), key=lambda p: p.created_at, default=None)
        if latest is None:
            return None
        return {
            "id": latest.pk,
            "status": latest.status,
            "reject_reason": latest.reject_reason,
            "transaction_id": latest.transaction_id,
        }

    def get_requirement(self, obj):
        return MatchingRequirementSerializer(obj.requirement, context=self.context).data


class GuardianApplicationSerializer(DemoFieldsMixin, serializers.ModelSerializer):
    """
    One applicant as the guardian sees them: the same public card as in search plus the cover
    note. No phone or email: those open only after a demo is booked.
    """

    tutor = TutorCardSerializer(read_only=True)
    demo_at = serializers.SerializerMethodField()
    unlock_fee = serializers.SerializerMethodField()
    contact = serializers.SerializerMethodField()

    class Meta:
        model = TutorApplication
        fields = [
            "id",
            "status",
            "message",
            "created_at",
            "tutor",
            "demo_at",
            "unlock_fee",
            "contact",
        ]
        read_only_fields = fields

    @staticmethod
    def other_user(obj):
        return obj.tutor.user


class BookDemoSerializer(serializers.Serializer):
    demo_at = serializers.DateTimeField()
