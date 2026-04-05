import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_create_admin"),
        ("competitions", "0004_participant_tracking_timestamps"),
    ]

    operations = [
        migrations.AddField(
            model_name="magiclink",
            name="participant",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="magic_links",
                to="competitions.participant",
            ),
        ),
        migrations.AlterField(
            model_name="magiclink",
            name="user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="magic_links",
                to="accounts.user",
            ),
        ),
    ]
