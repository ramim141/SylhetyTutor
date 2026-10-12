"""A deleted profile must not leave its NID / student-ID scans behind on disk."""

from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import TutorProfile


@receiver(post_delete, sender=TutorProfile)
def delete_documents_with_profile(sender, instance, **kwargs):
    for stored in (instance.nid_photo, instance.student_id_photo):
        if stored:
            stored.delete(save=False)
