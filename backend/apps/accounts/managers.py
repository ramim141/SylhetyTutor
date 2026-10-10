from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):
    """Users log in with phone or email; at least one is required."""

    use_in_migrations = True

    def _create_user(self, full_name, phone=None, email=None, password=None, **extra_fields):
        if not phone and not email:
            raise ValueError("Either phone or email must be provided.")
        email = self.normalize_email(email) if email else None
        user = self.model(full_name=full_name, phone=phone or None, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, full_name, phone=None, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(full_name, phone, email, password, **extra_fields)

    def create_superuser(self, full_name, phone=None, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "admin")
        if not extra_fields["is_staff"] or not extra_fields["is_superuser"]:
            raise ValueError("Superuser must have is_staff=True and is_superuser=True.")
        return self._create_user(full_name, phone, email, password, **extra_fields)
