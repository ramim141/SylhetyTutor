from rest_framework import serializers

from .models import TutorProfile


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
        primary_area = obj.areas.first()
        return primary_area.name_en if primary_area else "Sylhet City"

    def get_subjects(self, obj):
        return [s.name_en for s in obj.subjects.all()[:4]]

    def get_classes(self, obj):
        return [c.name_en for c in obj.class_levels.all()[:3]]
