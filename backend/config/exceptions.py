"""
Unified REST Framework exception handler.
Produces consistent, localization-friendly error responses with machine-readable 'code'
and field-level error mapping — Architecture Doc Section 5 & Sprint_1.md.
"""

from rest_framework import status
from rest_framework.exceptions import APIException, ErrorDetail
from rest_framework.views import exception_handler


class ConflictError(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "A conflict occurred."
    default_code = "conflict"

    def __init__(self, detail=None, code=None):
        code = code or self.default_code
        detail = detail or self.default_detail
        self.detail = ErrorDetail(detail, code)


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        return None

    data = response.data
    custom_data = {
        "detail": "An error occurred.",
        "code": "error",
    }

    if response.status_code == 401:
        custom_data["detail"] = "Authentication credentials were not provided or are invalid."
        custom_data["code"] = "not_authenticated"
        if isinstance(data, dict):
            detail_val = data.get("detail", "")
            if detail_val:
                custom_data["detail"] = str(detail_val)
            # simplejwt puts its code (token_not_valid) in the body; DRF keeps it on ErrorDetail
            custom_data["code"] = str(
                data.get("code") or getattr(detail_val, "code", None) or custom_data["code"]
            )
        response.data = custom_data
        return response

    if response.status_code == 403:
        custom_data["detail"] = "You do not have permission to perform this action."
        custom_data["code"] = "permission_denied"
        # a view that raised PermissionDenied with its own code (e.g. self_approval) keeps it
        own_code = exc.get_codes() if hasattr(exc, "get_codes") else None
        if isinstance(own_code, dict):
            own_code = own_code.get("detail")
        if not own_code and hasattr(exc, "detail") and getattr(exc.detail, "code", None):
            own_code = exc.detail.code
        if isinstance(own_code, str) and own_code != "permission_denied":
            custom_data["code"] = own_code
            if isinstance(data, dict) and data.get("detail"):
                custom_data["detail"] = str(data["detail"])
        response.data = custom_data
        return response

    if response.status_code == 429:
        custom_data["detail"] = "Request was throttled. Expected available in some time."
        custom_data["code"] = "throttled"
        wait = getattr(exc, "wait", None)
        if wait is not None:
            custom_data["retry_after"] = int(wait) + 1
        response.data = custom_data
        return response

    # 400 Validation Errors
    if isinstance(data, dict):
        custom_data["detail"] = "Invalid input."
        custom_data["code"] = "invalid"

        fields_dict = {}
        for key, value in data.items():
            if key in ("detail", "code"):
                continue

            field_errors = []
            if isinstance(value, list):
                for item in value:
                    code = getattr(item, "code", "invalid")
                    message = str(item)
                    field_errors.append({"code": code, "message": message})
            else:
                code = getattr(value, "code", "invalid")
                message = str(value)
                field_errors.append({"code": code, "message": message})

            fields_dict[key] = field_errors

        if fields_dict:
            custom_data["fields"] = fields_dict

        if "detail" in data and not fields_dict:
            custom_data["detail"] = str(data["detail"])
            custom_data["code"] = getattr(data.get("detail"), "code", "invalid")
        elif "detail" in data:
            # a named error that also lists fields (e.g. incomplete_profile)
            custom_data["detail"] = str(data["detail"])
            custom_data["code"] = getattr(data["detail"], "code", "invalid")

        response.data = custom_data

    return response
