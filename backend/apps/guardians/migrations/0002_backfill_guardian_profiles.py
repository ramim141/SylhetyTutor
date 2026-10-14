from django.conf import settings
from django.db import migrations


def give_existing_guardians_a_profile(apps, schema_editor):
    User = apps.get_model(*settings.AUTH_USER_MODEL.split("."))
    GuardianProfile = apps.get_model("guardians", "GuardianProfile")
    missing = User.objects.filter(role="guardian", guardian_profile__isnull=True)
    GuardianProfile.objects.bulk_create([GuardianProfile(user_id=pk) for pk in missing.values_list("pk", flat=True)])


class Migration(migrations.Migration):
    dependencies = [
        ("guardians", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(give_existing_guardians_a_profile, migrations.RunPython.noop),
    ]
