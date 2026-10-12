"""
Serializers for authentication and user accounts.
Sprint 1 — Architecture Doc Section 3.1 & Sprint_1.md.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenRefreshSerializer

from apps.lookups.models import Area

from .validators import normalize_email_address, validate_bd_phone

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    Standard user representation across all auth endpoints.
    """

    area = serializers.SlugRelatedField(slug_field="slug", read_only=True)
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "phone",
            "email",
            "role",
            "preferred_language",
            "area",
            "avatar",
            "date_joined",
        ]
        read_only_fields = ["id", "role", "date_joined"]

    def get_avatar(self, obj):
        return obj.avatar_url or None


class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150, min_length=2)
    phone = serializers.CharField(max_length=25, required=False, allow_blank=True)
    email = serializers.EmailField(max_length=255, required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    role = serializers.ChoiceField(
        choices=[(User.Role.GUARDIAN, "Guardian"), (User.Role.TUTOR, "Tutor")],
        default=User.Role.GUARDIAN,
    )
    preferred_language = serializers.ChoiceField(
        choices=User.Language.choices, default=User.Language.MIXED
    )
    area = serializers.SlugRelatedField(
        slug_field="slug",
        queryset=Area.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )

    def validate_phone(self, value):
        if not value:
            return None
        norm = validate_bd_phone(value)
        if User.objects.filter(phone=norm).exists():
            raise serializers.ValidationError(
                "A user with this phone already exists.", code="unique"
            )
        return norm

    def validate_email(self, value):
        if not value:
            return None
        norm = normalize_email_address(value)
        if User.objects.filter(email=norm).exists():
            raise serializers.ValidationError(
                "A user with this email already exists.", code="unique"
            )
        return norm

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        phone = attrs.get("phone")
        email = attrs.get("email")
        if not phone and not email:
            raise serializers.ValidationError(
                {"phone": ["Either phone or email must be provided."]},
                code="required",
            )
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(
            full_name=validated_data["full_name"],
            phone=validated_data.get("phone"),
            email=validated_data.get("email"),
            password=validated_data["password"],
            role=validated_data.get("role", User.Role.GUARDIAN),
            preferred_language=validated_data.get("preferred_language", User.Language.MIXED),
            area=validated_data.get("area"),
        )


class LoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(help_text="Phone number or email address")
    password = serializers.CharField(write_only=True, style={"input_type": "password"})


class TokenPairSerializer(serializers.Serializer):
    """Documentation-only shape of a JWT pair."""

    access = serializers.CharField()
    refresh = serializers.CharField()


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, style={"input_type": "password"})
    new_password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate_old_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError(
                "Current password is incorrect.", code="wrong_password"
            )
        return value

    def validate_new_password(self, value):
        # Passing the user lets the similarity validator compare against name/phone/email
        validate_password(value, user=self.context["request"].user)
        return value

    def validate(self, attrs):
        if attrs["old_password"] == attrs["new_password"]:
            raise serializers.ValidationError(
                {"new_password": ["Choose a password different from the current one."]},
                code="same_password",
            )
        return attrs


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["full_name", "email", "preferred_language"]

    def validate_email(self, value):
        if not value:
            return None
        norm = normalize_email_address(value)
        user = self.instance
        if User.objects.filter(email=norm).exclude(pk=user.pk).exists():
            raise serializers.ValidationError(
                "A user with this email already exists.", code="unique"
            )
        return norm


class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    """
    Standard SimpleJWT refresh serializer with token rotation support.
    """

    pass
