from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("competitions", "0003_competition_arrival_earliest_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="participant",
            name="magic_link_sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="participant",
            name="first_login_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="participant",
            name="transport_selected_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="participant",
            name="invoice_uploaded_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="participant",
            name="last_activity_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
