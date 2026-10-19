"""
Serializers for Safety, Reports and Replacement requests (Sprint 7).
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import ReplacementRequest, Report

User = get_user_model()


class ReportCreateSerializer(serializers.Serializer):
    target_user_id = serializers.UUIDField(required=False)
    target_slug = serializers.CharField(required=False, allow_blank=True)
    category = serializers.ChoiceField(choices=Report.Category.choices)
    reason = serializers.CharField(min_length=10, max_length=1000)

    def validate(self, attrs):
        if not attrs.get("target_user_id") and not attrs.get("target_slug"):
            raise serializers.ValidationError(
                {"target_user_id": ["Either target_user_id or target_slug is required."]}
            )
        return attrs


class ReportAdminSerializer(serializers.ModelSerializer):
    reporter_name = serializers.CharField(source="reporter.full_name", read_only=True)
    reporter_phone = serializers.CharField(source="reporter.phone", read_only=True)
    reporter_role = serializers.CharField(source="reporter.role", read_only=True)
    target_name = serializers.CharField(source="target_user.full_name", read_only=True)
    target_phone = serializers.CharField(source="target_user.phone", read_only=True)
    target_role = serializers.CharField(source="target_user.role", read_only=True)
    target_slug = serializers.SerializerMethodField()

    class Meta:
        model = Report
        fields = [
            "id",
            "reporter_name",
            "reporter_phone",
            "reporter_role",
            "target_name",
            "target_phone",
            "target_role",
            "target_user_id",
            "target_slug",
            "category",
            "reason",
            "status",
            "action_taken",
            "admin_notes",
            "resolved_at",
            "created_at",
        ]
        read_only_fields = fields

    def get_target_slug(self, obj):
        profile = getattr(obj.target_user, "tutor_profile", None)
        return profile.slug if profile else None


class ReportResolveSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=[
            Report.ActionTaken.DISMISSED,
            Report.ActionTaken.WARNED,
            Report.ActionTaken.SUSPENDED,
        ]
    )
    admin_notes = serializers.CharField(max_length=1000, required=False, allow_blank=True)


class ReportSuspendSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=5, max_length=500)


class ReplacementRequestCreateSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=10, max_length=1000)


class ReplacementRequestAdminSerializer(serializers.ModelSerializer):
    guardian_name = serializers.CharField(source="guardian.user.full_name", read_only=True)
    guardian_phone = serializers.CharField(source="guardian.user.phone", read_only=True)
    tutor_name = serializers.CharField(source="match.tutor.user.full_name", read_only=True)
    tutor_phone = serializers.CharField(source="match.tutor.user.phone", read_only=True)
    match_status = serializers.CharField(source="match.status", read_only=True)

    class Meta:
        model = ReplacementRequest
        fields = [
            "id",
            "match_id",
            "guardian_name",
            "guardian_phone",
            "tutor_name",
            "tutor_phone",
            "match_status",
            "reason",
            "status",
            "admin_notes",
            "created_at",
            "resolved_at",
        ]
        read_only_fields = fields


class ReplacementRequestResolveSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            ReplacementRequest.Status.PROCESSED,
            ReplacementRequest.Status.REJECTED,
        ]
    )
    admin_notes = serializers.CharField(max_length=1000, required=False, allow_blank=True)
