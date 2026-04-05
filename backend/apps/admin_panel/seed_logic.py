"""Veritabanı seed mantığı: management komutu ve post_migrate sinyali tarafından paylaşılır."""

from __future__ import annotations

import logging
import os
from typing import Callable

from django.contrib.auth import get_user_model

from apps.admin_panel.models import ModuleConfig
from apps.competitions.models import Competition, Participant, Team
from apps.reports.generator import PAYMENT_COLUMNS, RESULT_COLUMNS
from apps.validation.models import ReportTemplate, ValidationRule
from core.module_registry import ModuleRegistry

User = get_user_model()
logger = logging.getLogger(__name__)


def apply_seed(
    *,
    write: Callable[[str], None] | None = None,
    write_success: Callable[[str], None] | None = None,
) -> None:
    """
    write / write_success: management komutu stdout/style için.
    Verilmezse logging kullanılır.
    """

    def _write(msg: str) -> None:
        if write:
            write(msg)
        else:
            logger.info("%s", msg)

    def _ok(msg: str) -> None:
        if write_success:
            write_success(msg)
        else:
            logger.info("%s", msg)

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
        _ok("Admin oluşturuldu (şifre: env SEED_ADMIN_PASSWORD veya 'admin')")
    else:
        _write("Admin zaten var.")

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
        rd = dict(r)
        name = rd.pop("name")
        ValidationRule.objects.get_or_create(name=name, defaults=rd)

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

    result_cols = RESULT_COLUMNS
    payment_cols = PAYMENT_COLUMNS
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

    competitions_seed = [
        {
            "name": "TEKNOFEST 2025 Savaşan İHA",
            "slug": "savasan-iha-2025",
            "start_date": "2025-09-01",
            "end_date": "2025-09-07",
        },
        {
            "name": "TEKNOFEST 2025 Akıllı Ulaşım",
            "slug": "akilli-ulasim-2025",
            "start_date": "2025-09-01",
            "end_date": "2025-09-07",
        },
        {
            "name": "TEKNOFEST 2025 Tarım",
            "slug": "tarim-2025",
            "start_date": "2025-09-01",
            "end_date": "2025-09-07",
        },
        {
            "name": "DENEME",
            "slug": "deneme",
            "start_date": "2025-01-01",
            "end_date": "2025-12-31",
        },
    ]
    for c in competitions_seed:
        Competition.objects.get_or_create(
            slug=c["slug"],
            defaults={
                "name": c["name"],
                "start_date": c["start_date"],
                "end_date": c["end_date"],
                "max_supported_members": 5,
                "is_active": True,
            },
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

    _ok("Seed tamamlandı.")
