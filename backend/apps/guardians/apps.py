from django.apps import AppConfig


class GuardiansConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.guardians"
    verbose_name = "Guardians"

    def ready(self):
        from . import signals  # noqa: F401
