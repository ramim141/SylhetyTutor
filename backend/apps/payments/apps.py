from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.payments"
    verbose_name = "Payments"

    def ready(self):
        from apps.matching.signals import match_confirmed

        from . import commissions

        match_confirmed.connect(commissions.on_confirmed, dispatch_uid="commission-on-confirmed")
