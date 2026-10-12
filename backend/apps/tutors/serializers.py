from django.db import transaction
from rest_framework import serializers

from apps.lookups.models import Area, ClassLevel, Subject, University

from .models import TutorAvailability, TutorProfile


class TutorCardSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="user.full_name", read_only=True)
    initials = serializers.CharField(read_only=True)
    avatarUrl = serializers.SerializerMethodField()
    university = serializers.SerializerMethodField()
    area = serializers.SerializerMethodField()
    subjects = serializers.SerializerMethodField()
    classes = serializers.SerializerMethodField()
    rating = serializers.FloatField(source="rating_avg", read_only=True)
    reviewCount = serializers.IntegerField(source="review_count", read_only=True)
    feeMin = serializers.IntegerField(source="fee_min", read_only=True)
    feeMax = serializers.IntegerField(source="fee_max", read_only=True)
    isFeatured = serializers.BooleanField(source="is_featured", read_only=True)
    isVerified = serializers.BooleanField(source="is_verified", read_only=True)

    class Meta:
        model = TutorProfile
        fields = [
            "id",
            "name",
            "initials",
            "avatarUrl",
            "university",
            "area",
            "subjects",
            "classes",
            "rating",
            "reviewCount",
            "feeMin",
            "feeMax",
            "isFeatured",
            "isVerified",
        ]

    def get_avatarUrl(self, obj):
        if obj.user.avatar:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.user.avatar.url)
            return obj.user.avatar.url
        return None

    def get_university(self, obj):
        uni_name = (
            obj.university.short_name or obj.university.name_en
            if obj.university
            else "Sylhet University"
        )
        dept_str = f" ({obj.department})" if obj.department else ""
        return f"{uni_name}{dept_str}"

    def get_area(self, obj):
        primary_area = next(iter(obj.areas.all()), None)
        return primary_area.name_en if primary_area else "Sylhet City"

    def get_subjects(self, obj):
        return [s.name_en for s in obj.subjects.all()[:4]]

    def get_classes(self, obj):
        return [c.name_en for c in obj.class_levels.all()[:3]]


DAY_ORDER = {day: index for index, (day, _) in enumerate(TutorAvailability.Day.choices)}
SLOT_ORDER = {slot: index for index, (slot, _) in enumerate(TutorAvailability.Slot.choices)}

# Who the tutor is (identity) is checked by an admin; once approved these are locked.
IDENTITY_FIELDS = ("gender", "university", "department", "year", "student_id_number")


class AvailabilitySlotSerializer(serializers.Serializer):
    day = serializers.ChoiceField(choices=TutorAvailability.Day.choices)
    slot = serializers.ChoiceField(choices=TutorAvailability.Slot.choices)


class TutorMeSerializer(serializers.ModelSerializer):
    """The signed-in tutor's own profile, as the registration form and dashboard need it."""

    status = serializers.CharField(source="verification_status", read_only=True)
    university = serializers.SlugRelatedField(slug_field="slug", read_only=True)
    subjects = serializers.SlugRelatedField(many=True, slug_field="slug", read_only=True)
    class_levels = serializers.SlugRelatedField(many=True, slug_field="slug", read_only=True)
    areas = serializers.SlugRelatedField(many=True, slug_field="slug", read_only=True)
    availability = serializers.SerializerMethodField()
    missing = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = TutorProfile
        fields = [
            "id",
            "status",
            "rejection_reason",
            "submitted_at",
            "verified_at",
            "gender",
            "university",
            "department",
            "year",
            "student_id_number",
            "bio",
            "fee_min",
            "fee_max",
            "subjects",
            "class_levels",
            "areas",
            "availability",
            "missing",
            "can_edit",
        ]
        read_only_fields = fields

    def get_availability(self, obj):
        slots = sorted(obj.availability.all(), key=lambda a: (DAY_ORDER[a.day], SLOT_ORDER[a.slot]))
        return [{"day": a.day, "slot": a.slot} for a in slots]

    def get_missing(self, obj):
        return obj.missing_fields()

    def get_can_edit(self, obj):
        return obj.verification_status != TutorProfile.VerificationStatus.PENDING


class _ActiveSlugField(serializers.SlugRelatedField):
    """Lookup by slug among active rows; an unknown or retired slug is a field error."""

    def __init__(self, model, **kwargs):
        super().__init__(slug_field="slug", queryset=model.objects.filter(is_active=True), **kwargs)


class TutorMeUpdateSerializer(serializers.Serializer):
    """
    Draft save: any subset of fields, each checked on its own. Completeness is only
    demanded when the tutor submits. Fields not listed here (status, featured, rating…)
    cannot be set through this serializer.
    """

    gender = serializers.ChoiceField(choices=TutorProfile.Gender.choices, required=False)
    university = _ActiveSlugField(University, required=False, allow_null=True)
    department = serializers.CharField(max_length=150, required=False, allow_blank=True)
    year = serializers.CharField(max_length=50, required=False, allow_blank=True)
    student_id_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    bio = serializers.CharField(max_length=400, required=False, allow_blank=True)
    fee_min = serializers.IntegerField(
        min_value=1, max_value=1_000_000, required=False, allow_null=True
    )
    fee_max = serializers.IntegerField(
        min_value=1, max_value=1_000_000, required=False, allow_null=True
    )
    subjects = _ActiveSlugField(Subject, many=True, required=False)
    class_levels = _ActiveSlugField(ClassLevel, many=True, required=False)
    areas = _ActiveSlugField(Area, many=True, required=False)
    availability = AvailabilitySlotSerializer(many=True, required=False)

    def validate(self, attrs):
        profile = self.context["profile"]
        fee_min = attrs.get("fee_min", profile.fee_min)
        fee_max = attrs.get("fee_max", profile.fee_max)
        if fee_min is not None and fee_max is not None and fee_min > fee_max:
            raise serializers.ValidationError(
                {"fee_min": ["Minimum fee cannot be higher than the maximum."]},
                code="fee_range",
            )
        return attrs

    @transaction.atomic
    def save(self, **kwargs):
        profile = self.context["profile"]
        data = dict(self.validated_data)
        subjects = data.pop("subjects", None)
        class_levels = data.pop("class_levels", None)
        areas = data.pop("areas", None)
        availability = data.pop("availability", None)

        for name, value in data.items():
            setattr(profile, name, value)
        profile.save()

        if subjects is not None:
            profile.subjects.set(subjects)
        if class_levels is not None:
            profile.class_levels.set(class_levels)
        if areas is not None:
            profile.areas.set(areas)
        if availability is not None:
            wanted = {(slot["day"], slot["slot"]) for slot in availability}
            profile.availability.all().delete()
            TutorAvailability.objects.bulk_create(
                TutorAvailability(tutor=profile, day=day, slot=slot) for day, slot in sorted(wanted)
            )
        return profile
