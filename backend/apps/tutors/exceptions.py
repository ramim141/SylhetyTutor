from rest_framework import status
from rest_framework.exceptions import APIException


class ProfileLocked(APIException):
    """The profile is with an admin for review, so the tutor cannot change it right now."""

    status_code = status.HTTP_409_CONFLICT
    default_detail = "Your profile is being reviewed and cannot be changed right now."
    default_code = "profile_locked"


class AlreadySubmitted(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "This profile has already been submitted."
    default_code = "already_submitted"
