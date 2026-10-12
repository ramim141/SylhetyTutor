"""
Authentication views for SylhetyTutor.
Sprint 1 — Architecture Doc Section 3.1 & Sprint_1.md.
"""

import uuid

from django.contrib.auth import authenticate
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .imaging import clean_image
from .imgbb import ensure_configured, upload_image
from .serializers import (
    ChangePasswordSerializer,
    CustomTokenRefreshSerializer,
    LoginSerializer,
    LogoutSerializer,
    RegisterSerializer,
    TokenPairSerializer,
    UserSerializer,
    UserUpdateSerializer,
)
from .throttles import (
    AvatarUploadThrottle,
    LoginIdentifierThrottle,
    LoginIPThrottle,
    PasswordChangeThrottle,
    RegisterIPThrottle,
)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    refresh["role"] = user.role
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [RegisterIPThrottle]

    @extend_schema(
        tags=["auth"],
        summary="Register guardian or tutor",
        request=RegisterSerializer,
        responses={201: UserSerializer},
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = get_tokens_for_user(user)

        return Response(
            {
                "user": UserSerializer(user).data,
                "access": tokens["access"],
                "refresh": tokens["refresh"],
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginIdentifierThrottle, LoginIPThrottle]

    @extend_schema(
        tags=["auth"],
        summary="Login with phone or email",
        request=LoginSerializer,
        responses={200: UserSerializer},
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        identifier = serializer.validated_data["identifier"]
        password = serializer.validated_data["password"]

        user = authenticate(request, identifier=identifier, password=password)
        if not user:
            raise AuthenticationFailed(
                detail="Phone/email or password is incorrect.",
                code="invalid_credentials",
            )

        tokens = get_tokens_for_user(user)

        return Response(
            {
                "user": UserSerializer(user).data,
                "access": tokens["access"],
                "refresh": tokens["refresh"],
            },
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["auth"],
        summary="Get currently authenticated user profile",
        responses={200: UserSerializer},
    )
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @extend_schema(
        tags=["auth"],
        summary="Update authenticated user profile (name, email, preferred_language)",
        request=UserUpdateSerializer,
        responses={200: UserSerializer},
    )
    def patch(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


AVATAR_SIDE = 512


class AvatarView(APIView):
    """My profile photo: stored on imgBB (a public host), shown on the public site."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [AvatarUploadThrottle]
    parser_classes = [MultiPartParser]

    @extend_schema(
        tags=["auth"],
        summary="Upload my profile photo",
        description=(
            "Multipart form with one `file` (JPEG, PNG or WebP, at most 5 MB). It is cropped to "
            "a 512px square, re-encoded as JPEG without EXIF and sent to imgBB; `avatar` in the "
            "answer is its public URL. Errors on `file`: `required`, `file_too_large`, "
            "`not_an_image`, `unsupported_format`, `image_too_large`. 503 `uploads_unavailable` "
            "when imgBB is not configured, 502 `upload_failed` when imgBB refuses. Never use "
            "this for identity documents."
        ),
        request={
            "multipart/form-data": {
                "type": "object",
                "properties": {"file": {"type": "string", "format": "binary"}},
            }
        },
        responses={200: UserSerializer},
    )
    def put(self, request):
        ensure_configured()
        photo = clean_image(request.FILES.get("file"), max_side=AVATAR_SIDE, square=True)
        url, delete_url = upload_image(photo.read(), name=uuid.uuid4().hex)

        user = request.user
        user.avatar_url = url
        user.avatar_delete_url = delete_url
        user.save(update_fields=["avatar_url", "avatar_delete_url", "updated_at"])
        return Response(UserSerializer(user).data)

    @extend_schema(
        tags=["auth"],
        summary="Remove my profile photo",
        description=(
            "The site stops showing it at once. The copy on imgBB is not deleted automatically."
        ),
        responses={200: UserSerializer},
    )
    def delete(self, request):
        user = request.user
        user.avatar_url = ""
        user.avatar_delete_url = ""
        user.save(update_fields=["avatar_url", "avatar_delete_url", "updated_at"])
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["auth"],
        summary="Logout and blacklist refresh token",
        request=LogoutSerializer,
        responses={204: None},
    )
    def post(self, request):
        # Idempotent: an expired/unknown token still logs the client out (204)
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                if str(token.get("user_id")) == str(request.user.pk):
                    token.blacklist()
            except TokenError:
                pass
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [PasswordChangeThrottle]

    @extend_schema(
        tags=["auth"],
        summary="Change password (signed in)",
        description=(
            "Every refresh token of this account is revoked, so other devices are signed out. "
            "The response carries a fresh token pair for the current device."
        ),
        request=ChangePasswordSerializer,
        responses={200: TokenPairSerializer},
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])

        for outstanding in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=outstanding)

        return Response(get_tokens_for_user(user), status=status.HTTP_200_OK)


class CustomTokenRefreshView(TokenRefreshView):
    serializer_class = CustomTokenRefreshSerializer
