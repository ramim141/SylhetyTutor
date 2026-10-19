"""
Custom permission classes for role-based access control.
Architecture Doc Section 3.1 & Sprint_1.md.
"""

from rest_framework.permissions import BasePermission

from .models import User


class IsGuardian(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.GUARDIAN
        )


class IsGuardianOrAdmin(BasePermission):
    """Allows guardians as well as platform admins to manage tuition requirements."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.role in (User.Role.GUARDIAN, User.Role.ADMIN)
                or request.user.is_staff
            )
        )


class IsTutor(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and request.user.role == User.Role.TUTOR
        )


class IsApprovedTutor(BasePermission):
    """A tutor an admin has approved: the only ones who may see guardians' requirements."""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated and user.role == User.Role.TUTOR):
            return False
        profile = getattr(user, "tutor_profile", None)
        return bool(profile and profile.verification_status == "approved")


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.role == User.Role.ADMIN or request.user.is_staff)
        )


class IsOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == User.Role.ADMIN or request.user.is_staff:
            return True
        user_attr = getattr(obj, "user", None)
        return user_attr == request.user or obj == request.user
