from django.apps import AppConfig


class LookupsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.lookups"
    verbose_name = "Lookups & Reference Data"

    def ready(self):
        from . import signals  # noqa: F401
