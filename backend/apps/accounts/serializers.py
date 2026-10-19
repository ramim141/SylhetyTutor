"""
Serializers for authentication and user accounts.
Sprint 1 — Architecture Doc Section 3.1 & Sprint_1.md.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from rest_framework.fields import get_error_detail
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
    tutor_slug = serializers.SerializerMethodField()

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
            "tutor_slug",
            "date_joined",
        ]
        read_only_fields = ["id", "role", "date_joined"]

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_tutor_slug(self, obj):
        profile = getattr(obj, "tutor_profile", None)
        return profile.slug if profile else None

    @extend_schema_field(serializers.CharField(allow_null=True))
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
    acquisition_source = serializers.CharField(max_length=50, required=False, allow_blank=True)
    acquisition_medium = serializers.CharField(max_length=50, required=False, allow_blank=True)
    acquisition_campaign = serializers.CharField(max_length=100, required=False, allow_blank=True)
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

        # The field-level check above knows nothing about the person. Now that name, phone and
        # email are known, also refuse a password that is just a copy of them (Django's
        # similarity validator, configured for our fields in settings). Everything else was
        # already checked, so this can only add "too similar", never a duplicate message.
        who = User(full_name=attrs["full_name"], phone=phone, email=email)
        try:
            validate_password(attrs["password"], user=who)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": get_error_detail(exc)}) from exc
        return attrs

    def create(self, validated_data):
        extra = {}
        for key in ("acquisition_source", "acquisition_medium", "acquisition_campaign"):
            if validated_data.get(key):
                extra[key] = validated_data[key]

        return User.objects.create_user(
            full_name=validated_data["full_name"],
            phone=validated_data.get("phone"),
            email=validated_data.get("email"),
            password=validated_data["password"],
            role=validated_data.get("role", User.Role.GUARDIAN),
            preferred_language=validated_data.get("preferred_language", User.Language.MIXED),
            area=validated_data.get("area"),
            **extra,
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


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(
        required=False,
        help_text="The refresh token to revoke (optional: logging out twice is fine)",
    )


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
