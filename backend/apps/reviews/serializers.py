"""
Serializers for the Review API (Sprint 7).
"""

from rest_framework import serializers

from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    guardian_name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id",
            "guardian_name",
            "rating",
            "comment",
            "created_at",
        ]
        read_only_fields = ["id", "guardian_name", "created_at"]

    def get_guardian_name(self, obj):
        name = obj.guardian.user.full_name.strip()
        parts = name.split()
        if len(parts) > 1:
            return f"{parts[0]} {parts[-1][0]}."
        return name or "Guardian"


class ReviewCreateSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(max_length=500, required=False, allow_blank=True)


class GuardianReviewStatusSerializer(serializers.Serializer):
    can_review = serializers.BooleanField()
    has_reviewed = serializers.BooleanField()
    review = ReviewSerializer(allow_null=True)
