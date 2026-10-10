from django.core.exceptions import ValidationError
from django.contrib.auth.forms import BaseUserCreationForm, UserChangeForm

from .models import User


class BlankToNullMixin:
    """Store empty phone/email as NULL so the unique constraint allows many blanks."""

    def clean_phone(self):
        return self.cleaned_data.get("phone") or None

    def clean_email(self):
        return self.cleaned_data.get("email") or None


class UserCreationForm(BlankToNullMixin, BaseUserCreationForm):
    class Meta:
        model = User
        fields = ["full_name", "phone", "email", "role"]

    def clean(self):
        cleaned = super().clean()
        if not cleaned.get("phone") and not cleaned.get("email"):
            raise ValidationError("Either phone or email must be provided.")
        return cleaned


class UserAdminChangeForm(BlankToNullMixin, UserChangeForm):
    class Meta:
        model = User
        fields = "__all__"
