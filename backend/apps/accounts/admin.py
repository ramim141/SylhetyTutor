from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .forms import UserAdminChangeForm, UserCreationForm
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = UserAdminChangeForm
    add_form = UserCreationForm
    ordering = ["-date_joined"]
    list_display = ["full_name", "phone", "email", "role", "is_active", "date_joined"]
    list_filter = ["role", "is_active", "is_staff"]
    search_fields = ["full_name", "phone", "email"]
    readonly_fields = ["date_joined", "last_login"]
    fieldsets = [
        (None, {"fields": ["phone", "email", "password"]}),
        ("Profile", {"fields": ["full_name", "role", "avatar", "preferred_language"]}),
        (
            "Permissions",
            {"fields": ["is_active", "is_staff", "is_superuser", "groups", "user_permissions"]},
        ),
        ("Dates", {"fields": ["last_login", "date_joined"]}),
    ]
    add_fieldsets = [
        (
            None,
            {
                "classes": ["wide"],
                "fields": ["full_name", "phone", "email", "role", "password1", "password2"],
            },
        ),
    ]
