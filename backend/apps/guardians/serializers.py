from rest_framework import serializers

from apps.lookups.models import Area, ClassLevel, Subject
from apps.tutors.serializers import LookupNameSerializer

from .matching import budget_fits
from .models import Requirement
from .validators import contact_not_allowed

BUDGET_MIN, BUDGET_MAX = 500, 100000


class RequirementSerializer(serializers.ModelSerializer):
    """The guardian's own view of a requirement."""

    class_level = LookupNameSerializer(read_only=True)
    area = LookupNameSerializer(read_only=True)
    subjects = LookupNameSerializer(many=True, read_only=True)
    expires_at = serializers.DateTimeField(read_only=True)
    expired = serializers.BooleanField(source="is_expired", read_only=True)
    missing = serializers.SerializerMethodField()

    class Meta:
        model = Requirement
        fields = [
            "id",
            "status",
            "class_level",
            "area",
            "subjects",
            "budget_min",
            "budget_max",
            "preferred_gender",
            "schedule_note",
            "published_at",
            "expires_at",
            "expired",
            "closed_at",
            "close_reason",
            "created_at",
            "missing",
        ]
        read_only_fields = fields

    def get_missing(self, obj):
        return obj.missing_fields()


class RequirementWriteSerializer(serializers.Serializer):
    """Create or change a draft. Lookups are sent as slugs, like everywhere else in the API."""

    class_level = serializers.SlugRelatedField(
        slug_field="slug", queryset=ClassLevel.objects.filter(is_active=True), required=False
    )
    area = serializers.SlugRelatedField(
        slug_field="slug", queryset=Area.objects.filter(is_active=True), required=False
    )
    subjects = serializers.SlugRelatedField(
        slug_field="slug",
        queryset=Subject.objects.filter(is_active=True),
        many=True,
        required=False,
        allow_empty=True,
    )
    budget_min = serializers.IntegerField(
        min_value=BUDGET_MIN, max_value=BUDGET_MAX, required=False, allow_null=True
    )
    budget_max = serializers.IntegerField(
        min_value=BUDGET_MIN, max_value=BUDGET_MAX, required=False, allow_null=True
    )
    preferred_gender = serializers.ChoiceField(choices=Requirement.Gender.choices, required=False)
    schedule_note = serializers.CharField(
        max_length=300,
        required=False,
        allow_blank=True,
        validators=[contact_not_allowed],
    )

    def validate(self, attrs):
        current = self.instance
        low = attrs.get("budget_min", current.budget_min if current else None)
        high = attrs.get("budget_max", current.budget_max if current else None)
        if low is not None and high is not None and low > high:
            raise serializers.ValidationError(
                {"budget_min": ["Minimum budget cannot be higher than the maximum."]}
            )
        return attrs

    def update(self, instance, validated_data):
        subjects = validated_data.pop("subjects", None)
        for name, value in validated_data.items():
            setattr(instance, name, value)
        instance.save()
        if subjects is not None:
            instance.subjects.set(subjects)
        return instance


class CloseSerializer(serializers.Serializer):
    reason = serializers.ChoiceField(choices=Requirement.CloseReason.choices, required=False)


class MatchingRequirementSerializer(serializers.ModelSerializer):
    """
    What a tutor may see. An allow-list on purpose: no guardian, no phone, no address. Contact
    opens only after a booked demo (Architecture Doc 8.8).
    """

    class_level = LookupNameSerializer(read_only=True)
    area = LookupNameSerializer(read_only=True)
    subjects = LookupNameSerializer(many=True, read_only=True)
    budget_fits = serializers.SerializerMethodField()

    class Meta:
        model = Requirement
        fields = [
            "id",
            "class_level",
            "area",
            "subjects",
            "budget_min",
            "budget_max",
            "preferred_gender",
            "schedule_note",
            "published_at",
            "budget_fits",
        ]
        read_only_fields = fields

    def get_budget_fits(self, obj):
        return budget_fits(obj, self.context["profile"])
