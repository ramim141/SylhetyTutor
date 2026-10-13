"""Drop the cached /lookups/ payload whenever a lookup row changes (admin edit, seed_data)."""

from django.core.cache import cache
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Area, ClassLevel, Subject, University
from .views import LOOKUPS_CACHE_KEY


@receiver([post_save, post_delete], sender=Area)
@receiver([post_save, post_delete], sender=Subject)
@receiver([post_save, post_delete], sender=ClassLevel)
@receiver([post_save, post_delete], sender=University)
def clear_lookups_cache(sender, **kwargs):
    cache.delete(LOOKUPS_CACHE_KEY)
