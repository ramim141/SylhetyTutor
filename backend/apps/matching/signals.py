from django.dispatch import Signal

# Sent when a guardian says the tuition started: `match` is the confirmed Match. Commission (in
# apps.payments) listens, so matching does not need to know about money.
match_confirmed = Signal()
