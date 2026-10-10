"""
Unified REST Framework exception handler.
Produces consistent, localization-friendly error responses with machine-readable 'code'
and field-level error mapping — Architecture Doc Section 5 & Sprint_1.md.
"""

from rest_framework.views import exception_handler


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
        custom_data["code"] = "invalid_credentials"
        if isinstance(data, dict):
            detail_val = data.get("detail", "")
            if detail_val:
                custom_data["detail"] = str(detail_val)
            if "code" in data:
                custom_data["code"] = str(data["code"])
        response.data = custom_data
        return response

    if response.status_code == 403:
        custom_data["detail"] = "You do not have permission to perform this action."
        custom_data["code"] = "permission_denied"
        response.data = custom_data
        return response

    if response.status_code == 429:
        custom_data["detail"] = "Request was throttled. Expected available in some time."
        custom_data["code"] = "throttled"
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

        response.data = custom_data

    return response
