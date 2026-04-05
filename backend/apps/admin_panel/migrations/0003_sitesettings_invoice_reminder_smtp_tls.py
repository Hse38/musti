from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("admin_panel", "0002_sitesettings"),
    ]

    operations = [
        migrations.AddField(
            model_name="sitesettings",
            name="invoice_approved_subject",
            field=models.CharField(
                default="Ulaşım Desteği Başvurunuz Onaylandı", max_length=200
            ),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="invoice_approved_body",
            field=models.TextField(
                default=(
                    "Sayın {name},\n\n{competition} kapsamındaki ulaşım desteği başvurunuz "
                    "onaylanmıştır.\n\nOnaylanan tutar: {amount} TL\n"
                    "Ödeme açıklaması: {payment_description}\n\n"
                    "Sorularınız: {support_email}"
                )
            ),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="invoice_rejected_subject",
            field=models.CharField(
                default="Ulaşım Desteği Başvurunuz Hakkında", max_length=200
            ),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="invoice_rejected_body",
            field=models.TextField(
                default=(
                    "Sayın {name},\n\nBaşvurunuz incelendi, aşağıdaki nedenlerle reddedilmiştir:\n"
                    "{reasons}\n\nPortal: {portal_url}"
                )
            ),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="reminder_subject",
            field=models.CharField(
                blank=True,
                default="TEKNOFEST Ulaşım Desteği — Başvurunuzu Tamamlayın",
                max_length=200,
            ),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="reminder_body",
            field=models.TextField(
                blank=True,
                default=(
                    "Sayın {name},\n\n{competition} için ulaşım desteği başvurunuzu "
                    "henüz tamamlamadınız.\n\nGiriş: {link}\nSon tarih: {deadline}"
                ),
            ),
        ),
        migrations.AddField(
            model_name="sitesettings",
            name="smtp_use_tls",
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name="sitesettings",
            name="magic_link_body",
            field=models.TextField(
                default=(
                    "Merhaba {name},\n\n{competition} için giriş linkiniz:\n{link}\n\n"
                    "Son tarih: {deadline}"
                )
            ),
        ),
    ]
