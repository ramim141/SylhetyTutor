from django.db import transaction
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.lookups.models import Area, ClassLevel, Subject, University

from .models import TutorAvailability, TutorProfile


class LookupNameSerializer(serializers.Serializer):
    """A subject / class / area with both names, so the page can pick the user's language."""

    slug = serializers.CharField()
    name_en = serializers.CharField()
    name_bn = serializers.CharField()


class UniversityNameSerializer(LookupNameSerializer):
    short_name = serializers.CharField()


class TutorCardSerializer(serializers.ModelSerializer):
    """
    A search result. Lookup names come with both languages so the page can show the
    visitor's own (Bangla mode must not show English names). Anything the tutor has not
    filled in is null, never a made-up placeholder such as a fake university or area.
    """

    name = serializers.CharField(source="user.full_name", read_only=True)
    initials = serializers.CharField(read_only=True)
    avatarUrl = serializers.SerializerMethodField()
    university = UniversityNameSerializer(read_only=True)
    department = serializers.CharField(read_only=True)
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
            "slug",
            "name",
            "initials",
            "avatarUrl",
            "university",
            "department",
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

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_avatarUrl(self, obj):
        return obj.user.avatar_url or None

    @extend_schema_field(LookupNameSerializer(allow_null=True))
    def get_area(self, obj):
        # the first one stands for the tutor on a card; the profile lists them all
        area = next(iter(obj.areas.all()), None)
        return LookupNameSerializer(area).data if area else None

    @extend_schema_field(LookupNameSerializer(many=True))
    def get_subjects(self, obj):
        return LookupNameSerializer(list(obj.subjects.all())[:4], many=True).data

    @extend_schema_field(LookupNameSerializer(many=True))
    def get_classes(self, obj):
        return LookupNameSerializer(list(obj.class_levels.all())[:3], many=True).data


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
    documents = serializers.SerializerMethodField()
    missing = serializers.SerializerMethodField()
    required_total = serializers.SerializerMethodField()
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = TutorProfile
        fields = [
            "id",
            "slug",
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
            "documents",
            "missing",
            "required_total",
            "can_edit",
        ]
        read_only_fields = fields

    @extend_schema_field(AvailabilitySlotSerializer(many=True))
    def get_availability(self, obj):
        slots = sorted(obj.availability.all(), key=lambda a: (DAY_ORDER[a.day], SLOT_ORDER[a.slot]))
        return [{"day": a.day, "slot": a.slot} for a in slots]

    @extend_schema_field(
        {
            "type": "object",
            "properties": {"nid": {"type": "boolean"}, "student_id": {"type": "boolean"}},
        }
    )
    def get_documents(self, obj):
        # Only whether each file exists; the file itself is streamed by its own endpoint
        return {"nid": bool(obj.nid_photo), "student_id": bool(obj.student_id_photo)}

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_missing(self, obj):
        return obj.missing_fields()

    @extend_schema_field(serializers.IntegerField())
    def get_required_total(self, obj):
        # so "5 of 13 done" needs no number hard-coded in the frontend
        return len(TutorProfile.FORM_ORDER)

    @extend_schema_field(serializers.BooleanField())
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


class TutorPublicSerializer(serializers.ModelSerializer):
    """
    What anyone may see on a tutor's public page. It lists its fields on purpose (never
    `__all__`): contact details, student-ID number, documents and review state stay out.
    """

    name = serializers.CharField(source="user.full_name", read_only=True)
    initials = serializers.CharField(read_only=True)
    avatarUrl = serializers.SerializerMethodField()
    university = UniversityNameSerializer(read_only=True)
    subjects = LookupNameSerializer(many=True, read_only=True)
    classLevels = LookupNameSerializer(source="class_levels", many=True, read_only=True)
    areas = LookupNameSerializer(many=True, read_only=True)
    availability = serializers.SerializerMethodField()
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
            "slug",
            "name",
            "initials",
            "avatarUrl",
            "gender",
            "university",
            "department",
            "year",
            "bio",
            "feeMin",
            "feeMax",
            "subjects",
            "classLevels",
            "areas",
            "availability",
            "rating",
            "reviewCount",
            "isFeatured",
            "isVerified",
        ]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_avatarUrl(self, obj):
        return obj.user.avatar_url or None

    @extend_schema_field(AvailabilitySlotSerializer(many=True))
    def get_availability(self, obj):
        slots = sorted(obj.availability.all(), key=lambda a: (DAY_ORDER[a.day], SLOT_ORDER[a.slot]))
        return [{"day": a.day, "slot": a.slot} for a in slots]
