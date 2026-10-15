"""
Ask guardians "did the tuition start?" for demos that are old enough. Run once a day (cron or a
scheduler). `--days-ahead N` pretends it is N days from now, to try the whole cycle without waiting.
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.matching import confirmation


class Command(BaseCommand):
    help = "Send the guardian confirmation links that are due."

    def add_arguments(self, parser):
        parser.add_argument("--days-ahead", type=int, default=0, help="pretend it is N days later")
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        now = timezone.now() + timedelta(days=options["days_ahead"])
        matches = list(confirmation.due_matches(now))
        if options["dry_run"]:
            self.stdout.write(f"{len(matches)} confirmation(s) would be sent.")
            return
        sent = sum(confirmation.request_confirmation(match, now) for match in matches)
        self.stdout.write(f"{sent} confirmation(s) sent.")
