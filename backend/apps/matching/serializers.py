from rest_framework import serializers

from apps.guardians.serializers import MatchingRequirementSerializer
from apps.guardians.validators import contact_not_allowed
from apps.tutors.serializers import TutorCardSerializer

from .models import TutorApplication


class ApplyWriteSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=300, required=False, allow_blank=True)

    def validate_message(self, value):
        return contact_not_allowed(value.strip())


class TutorApplicationSerializer(serializers.ModelSerializer):
    """
    A tutor's own application. The requirement is the same allow-list a tutor already sees (no
    guardian name, phone or address).
    """

    requirement = serializers.SerializerMethodField()

    class Meta:
        model = TutorApplication
        fields = ["id", "status", "message", "created_at", "requirement"]
        read_only_fields = fields

    def get_requirement(self, obj):
        return MatchingRequirementSerializer(obj.requirement, context=self.context).data


class GuardianApplicationSerializer(serializers.ModelSerializer):
    """
    One applicant as the guardian sees them: the same public card as in search plus the cover
    note. No phone or email: those open only after a demo is booked.
    """

    tutor = TutorCardSerializer(read_only=True)

    class Meta:
        model = TutorApplication
        fields = ["id", "status", "message", "created_at", "tutor"]
        read_only_fields = fields
