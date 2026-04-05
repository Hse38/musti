from django.core.management.base import BaseCommand

from apps.admin_panel.seed_logic import apply_seed


class Command(BaseCommand):
    help = "İlk veriler: admin, kurallar, modül kayıtları, örnek yarışma, rapor şablonları"

    def handle(self, *args, **options):
        apply_seed(
            write=lambda m: self.stdout.write(m),
            write_success=lambda m: self.stdout.write(self.style.SUCCESS(m)),
        )
