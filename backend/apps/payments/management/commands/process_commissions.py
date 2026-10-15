"""
Daily commission pass: reminder at 14 days, applying paused at 21. `--days-ahead N` pretends it is
N days later, to try the cycle without waiting.
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.payments import commissions


class Command(BaseCommand):
    help = "Remind about and suspend for overdue commissions."

    def add_arguments(self, parser):
        parser.add_argument("--days-ahead", type=int, default=0)

    def handle(self, *args, **options):
        now = timezone.now() + timedelta(days=options["days_ahead"])
        reminded, suspended = commissions.process(now)
        self.stdout.write(f"{reminded} reminder(s) sent, {suspended} tutor(s) suspended.")
