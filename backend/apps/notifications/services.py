from django.db import transaction

from .emails import send_notification_email
from .models import Notification


def notify(user, kind, **data):
    """
    Record a notification for `user` and, once the surrounding transaction commits, email it
    (if they have an address). The row is saved with the change that caused it, so one never
    exists without the other.
    """
    notification = Notification.objects.create(user=user, kind=kind, data=data)
    transaction.on_commit(lambda: send_notification_email(notification))
    return notification
