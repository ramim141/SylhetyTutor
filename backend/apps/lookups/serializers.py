from rest_framework import serializers

from .models import Area, ClassLevel, Subject, University


class AreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = ["id", "name_en", "name_bn", "slug", "sort_order"]


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ["id", "name_en", "name_bn", "slug", "sort_order"]


class ClassLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassLevel
        fields = ["id", "name_en", "name_bn", "slug", "sort_order"]


class UniversitySerializer(serializers.ModelSerializer):
    class Meta:
        model = University
        fields = ["id", "name_en", "name_bn", "short_name", "slug", "sort_order"]


class LookupsGroupedSerializer(serializers.Serializer):
    areas = AreaSerializer(many=True)
    subjects = SubjectSerializer(many=True)
    class_levels = ClassLevelSerializer(many=True)
    universities = UniversitySerializer(many=True)
