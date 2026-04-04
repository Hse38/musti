import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.admin_panel.models import ModuleConfig
from apps.competitions.models import Competition, Participant, Team
from apps.validation.models import ReportTemplate, ValidationRule
from core.module_registry import ModuleRegistry


User = get_user_model()


class Command(BaseCommand):
    help = "İlk veriler: admin, kurallar, modül kayıtları, örnek yarışma, rapor şablonları"

    def handle(self, *args, **options):
        pwd = os.environ.get("SEED_ADMIN_PASSWORD", "admin")
        u, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "role": "superadmin",
                "email": "admin@teknofest.local",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            u.set_password(pwd)
            u.save()
            self.stdout.write(self.style.SUCCESS(f"Admin oluşturuldu (şifre: env SEED_ADMIN_PASSWORD veya 'admin')"))
        else:
            self.stdout.write("Admin zaten var.")

        rules = [
            {
                "name": "check_support_scope",
                "display_name": "Destek kapsamı kontrolü",
                "description": "Katılımcı destek kapsamında mı?",
                "category": "basic",
                "priority": 10,
                "is_blocking": True,
            },
            {
                "name": "check_plane_selected",
                "display_name": "Uçak seçimi kontrolü",
                "description": "Uçak seçiliyse bilet yüklenemez",
                "category": "basic",
                "priority": 20,
                "is_blocking": True,
            },
            {
                "name": "check_transport_type",
                "display_name": "Ulaşım türü geçerliliği",
                "description": "İzin verilen ulaşım türleri",
                "category": "basic",
                "priority": 30,
                "is_blocking": False,
                "config": {"allowed_types": ["bus", "train", "other"]},
            },
            {
                "name": "check_transport_match",
                "display_name": "Bilet-talep uyumu",
                "description": "Fatura ve talep ulaşım tipi",
                "category": "basic",
                "priority": 40,
                "is_blocking": False,
            },
            {
                "name": "check_amount_validity",
                "display_name": "Tutar geçerliliği",
                "description": "Fatura tutarı pozitif olmalı",
                "category": "invoice",
                "priority": 50,
                "is_blocking": False,
            },
            {
                "name": "check_invoice_owner",
                "display_name": "Fatura sahibi kontrolü",
                "description": "Fatura katılımcı ile uyumlu mu",
                "category": "invoice",
                "priority": 60,
                "is_blocking": False,
            },
            {
                "name": "check_invoice_date",
                "display_name": "Fatura tarihi kontrolü",
                "description": "Yarışma tarih aralığında mı",
                "category": "invoice",
                "priority": 70,
                "is_blocking": False,
            },
            {
                "name": "check_duplicate",
                "display_name": "Mükerrer başvuru kontrolü",
                "description": "Aynı TC + tarih + tutar",
                "category": "duplicate",
                "priority": 80,
                "is_blocking": False,
            },
            {
                "name": "check_iban",
                "display_name": "IBAN geçerliliği",
                "description": "TR IBAN ve dijital cüzdan kontrolü",
                "category": "iban",
                "priority": 90,
                "is_blocking": False,
            },
        ]
        for r in rules:
            name = r.pop("name")
            ValidationRule.objects.get_or_create(name=name, defaults=r)

        for name, module in ModuleRegistry.get_all().items():
            ModuleConfig.objects.get_or_create(
                name=name,
                defaults={
                    "display_name": module.display_name,
                    "description": module.description,
                    "version": module.version,
                    "is_active": False,
                },
            )

        result_cols = [
            {"key": "full_name", "label": "Katılımcı Adı", "order": 1},
            {"key": "tc_id", "label": "TC Kimlik", "order": 2},
            {"key": "team", "label": "Takım", "order": 3},
            {"key": "transport_type", "label": "Ulaşım Tipi", "order": 4},
            {"key": "status", "label": "Durum", "order": 5},
            {"key": "errors", "label": "Hatalar", "order": 6},
            {"key": "amount", "label": "Tutar", "order": 7},
        ]
        payment_cols = [
            {"key": "account_holder_name", "label": "Hesap Sahibi", "order": 1},
            {"key": "tc_id", "label": "TC Kimlik No", "order": 2},
            {"key": "bank_name", "label": "Banka Adı", "order": 3},
            {"key": "iban", "label": "IBAN", "order": 4},
            {"key": "amount", "label": "Tutar (TL)", "order": 5},
            {"key": "description", "label": "Açıklama", "order": 6},
        ]
        if not ReportTemplate.objects.filter(report_type="result", is_default=True).exists():
            ReportTemplate.objects.create(
                name="Varsayılan Sonuç",
                report_type="result",
                columns=result_cols,
                is_default=True,
                created_by=u if u.pk else None,
            )
        if not ReportTemplate.objects.filter(report_type="payment", is_default=True).exists():
            ReportTemplate.objects.create(
                name="Varsayılan Ödeme",
                report_type="payment",
                columns=payment_cols,
                is_default=True,
                created_by=u if u.pk else None,
            )

        comp, _ = Competition.objects.get_or_create(
            slug="teknofest-demo",
            defaults={
                "name": "TEKNOFEST Demo Yarışması",
                "start_date": "2025-01-01",
                "end_date": "2025-12-31",
                "max_supported_members": 10,
                "is_active": True,
            },
        )
        team, _ = Team.objects.update_or_create(
            team_code="DEMO-001",
            defaults={
                "competition": comp,
                "name": "Demo Takım",
                "supported_member_count": 3,
            },
        )
        if not Participant.objects.filter(team=team).exists():
            Participant.objects.create(
                team=team,
                full_name="Ahmet Yılmaz",
                tc_id="10000000001",
                email="ahmet@example.com",
                transport_type="bus",
                is_supported=True,
                iban="TR330006100519786457841326",
                bank_name="Ziraat Bankası",
                account_holder_name="Ahmet Yılmaz",
            )
            Participant.objects.create(
                team=team,
                full_name="Fatma Demir",
                tc_id="10000000002",
                email="fatma@example.com",
                transport_type="train",
                is_supported=True,
                iban="TR330006100519786457841327",
                bank_name="İş Bankası",
                account_holder_name="Fatma Demir",
            )

        self.stdout.write(self.style.SUCCESS("Seed tamamlandı."))
