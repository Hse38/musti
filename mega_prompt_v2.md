# TEKNOFEST Ulaşım Destek Sistemi — Tam Sistem Cursor Prompt v2

> Bu prompt Cursor AI'a verilecek. Sıfırdan geliştir.

---

## 1. SİSTEM TANIMI

TEKNOFEST finalist takımlarının ulaşım destek sürecini uçtan uca dijitalleştiren,
**tam dinamik**, **çok dilli**, **AI destekli**, **admin panelli**, **mobil öncelikli** web uygulaması.

### Temel Prensipler
- **Tam dinamik:** Logo, renkler, metinler, kurallar, diller — hepsi admin panelden değiştirilebilir.
- **Modüler:** Her özellik ayrı Django app. Yeni modül = yeni app, mevcut kod değişmez.
- **AI her yerde:** Fatura okuma, SSS cevaplama, çeviri, yardım — Claude API her katmanda.
- **Premium UI:** Modern card-based, dark/light mode, mobil öncelikli.
- **Çok dilli:** Admin panelden yeni dil eklenebilir, Claude API otomatik çevirir.
- **Gerçek zamanlı:** WebSocket ile admin bildirimleri ve canlı durum takibi.

---

## 2. TEKNOLOJİ STACK

| Katman | Teknoloji |
|---|---|
| Backend | Django 4.2 + Django REST Framework |
| Gerçek zamanlı | Django Channels + Redis |
| Veritabanı | PostgreSQL |
| Frontend | Next.js 14 App Router + TypeScript + Tailwind CSS |
| UI | shadcn/ui + Framer Motion |
| AI | Anthropic Claude API (claude-sonnet-4-20250514) |
| i18n | next-intl (frontend) |
| Excel | openpyxl |
| Auth | djangorestframework-simplejwt + magic link |
| Deploy | Railway (backend + DB + Redis) + Vercel (frontend) |

---

## 3. VERİTABANI MODELLERİ

### accounts/models.py
```python
class User(AbstractUser):
    ROLE_CHOICES = [
        ('superadmin', 'Süper Admin'),
        ('admin', 'Admin'),
        ('captain', 'Kaptan'),
        ('participant', 'Katılımcı'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='participant')
    preferred_language = models.CharField(max_length=10, default='tr')

class MagicLink(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
```

### competitions/models.py
```python
class Competition(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    year = models.IntegerField()
    arrival_earliest = models.DateField()      # En erken geliş
    arrival_latest = models.DateField()        # En geç geliş
    departure_earliest = models.DateField()    # En erken çıkış
    departure_latest = models.DateField()      # En geç çıkış
    max_supported_members = models.IntegerField()
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ['name', 'year']

class Team(models.Model):
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE, related_name='teams')
    name = models.CharField(max_length=255)
    team_id = models.CharField(max_length=50)
    captain = models.ForeignKey('Participant', on_delete=models.SET_NULL, null=True, blank=True, related_name='captained_teams')

    class Meta:
        unique_together = ['competition', 'team_id']

class Participant(models.Model):
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='participants')
    user = models.OneToOneField('accounts.User', on_delete=models.CASCADE, null=True)
    full_name = models.CharField(max_length=255)
    tc_id = models.CharField(max_length=11)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    is_captain = models.BooleanField(default=False)
    is_supported = models.BooleanField(default=True)
    onboarding_completed = models.BooleanField(default=False)
```

### transport/models.py
```python
class TransportRequest(models.Model):
    TRANSPORT_CHOICES = [
        ('plane', 'Uçak'),
        ('bus', 'Otobüs'),
        ('train', 'Tren'),
        ('self', 'Kendi İmkanımla'),
    ]
    participant = models.OneToOneField('competitions.Participant', on_delete=models.CASCADE)
    transport_type = models.CharField(max_length=20, choices=TRANSPORT_CHOICES)

    # Uçak için
    preferred_arrival_date = models.DateField(null=True, blank=True)
    preferred_departure_date = models.DateField(null=True, blank=True)
    flight_notes = models.TextField(blank=True)

    # Otobüs/Tren için
    origin_city = models.CharField(max_length=100, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    account_holder_name = models.CharField(max_length=255, blank=True)
    iban = models.CharField(max_length=34, blank=True)

    status = models.CharField(max_length=30, default='pending', choices=[
        ('pending', 'Bekliyor'),
        ('info_collected', 'Bilgiler alındı'),
        ('invoice_uploaded', 'Fatura yüklendi'),
        ('approved', 'Onaylandı'),
        ('rejected', 'Reddedildi'),
        ('plane_confirmed', 'Uçak bileti alındı'),
        ('self_noted', 'Kendi imkanı'),
    ])
```

### invoices/models.py
```python
class Invoice(models.Model):
    transport_request = models.ForeignKey('transport.TransportRequest', on_delete=models.CASCADE, related_name='invoices')
    uploaded_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True)
    file = models.FileField(upload_to='invoices/%Y/%m/')

    # AI çıktıları
    ai_extracted_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    ai_extracted_date = models.DateField(null=True)
    ai_extracted_owner = models.CharField(max_length=255, blank=True)
    ai_extracted_transport_type = models.CharField(max_length=50, blank=True)
    ai_extracted_origin = models.CharField(max_length=100, blank=True)
    ai_extracted_destination = models.CharField(max_length=100, blank=True)
    ai_confidence = models.FloatField(null=True)
    ai_raw_response = models.JSONField(default=dict)

    status = models.CharField(max_length=20, default='pending', choices=[
        ('pending', 'Bekliyor'),
        ('manual_review', 'Manuel inceleme'),   # AI confidence < 0.7
        ('approved', 'Onaylandı'),
        ('rejected', 'Reddedildi'),
    ])
    rejection_reasons = models.JSONField(default=list)
    validated_at = models.DateTimeField(null=True)
```

### admin_panel/models.py
```python
class SiteSettings(models.Model):
    """Tek satır — tüm site ayarları."""
    site_name = models.CharField(max_length=100, default='TEKNOFEST Ulaşım Sistemi')
    logo = models.ImageField(upload_to='branding/', null=True, blank=True)
    favicon = models.ImageField(upload_to='branding/', null=True, blank=True)
    primary_color = models.CharField(max_length=7, default='#2563EB')
    secondary_color = models.CharField(max_length=7, default='#7C3AED')
    support_email = models.EmailField(blank=True)
    support_phone = models.CharField(max_length=20, blank=True)

    # SMTP
    smtp_host = models.CharField(max_length=200, blank=True)
    smtp_port = models.IntegerField(default=587)
    smtp_user = models.CharField(max_length=200, blank=True)
    smtp_password = models.CharField(max_length=200, blank=True)
    email_from_name = models.CharField(max_length=100, default='TEKNOFEST')

    # Mail şablonu (admin değiştirebilir)
    magic_link_subject = models.CharField(max_length=200, default='TEKNOFEST - Giriş Linki')
    magic_link_body = models.TextField(default='Merhaba {name},\n\nGiriş: {link}')

class ValidationRule(models.Model):
    name = models.CharField(max_length=100, unique=True)
    display_name = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    priority = models.IntegerField(default=100)
    is_blocking = models.BooleanField(default=True)
    config = models.JSONField(default=dict)

class ModuleConfig(models.Model):
    name = models.CharField(max_length=100, unique=True)
    display_name = models.CharField(max_length=200)
    is_active = models.BooleanField(default=False)
    config = models.JSONField(default=dict)
```

### faq/models.py
```python
class FAQDocument(models.Model):
    competition = models.ForeignKey('competitions.Competition', on_delete=models.CASCADE, null=True, blank=True)
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to='faq/', null=True, blank=True)
    content = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

class FAQConversation(models.Model):
    participant = models.ForeignKey('competitions.Participant', on_delete=models.CASCADE)
    question = models.TextField()
    answer = models.TextField(blank=True)
    answered_by_ai = models.BooleanField(default=True)
    escalated_to_admin = models.BooleanField(default=False)
    admin_response = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### i18n_app/models.py
```python
class Language(models.Model):
    code = models.CharField(max_length=10, unique=True)   # 'tr', 'en', 'ar'
    name = models.CharField(max_length=50)
    native_name = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    is_rtl = models.BooleanField(default=False)
    flag_emoji = models.CharField(max_length=10, blank=True)

class Translation(models.Model):
    language = models.ForeignKey(Language, on_delete=models.CASCADE)
    key = models.CharField(max_length=255)
    value = models.TextField()
    auto_translated = models.BooleanField(default=False)

    class Meta:
        unique_together = ['language', 'key']
```

---

## 4. XLSX PARSER

Admin finalist xlsx yüklediğinde şu sütunları oku:

```
yarışma_adı | takım_adı | takım_id | ad | soyad | email | kaptan_mi
```

```python
class ParticipantXLSXParser:
    def parse(self, file_path: str) -> dict:
        """
        Döner:
        {
            'competition_name': str,
            'teams': [
                {
                    'team_name': str,
                    'team_id': str,
                    'participants': [
                        {'full_name': str, 'email': str, 'is_captain': bool}
                    ]
                }
            ]
        }
        """

def process_xlsx_upload(file_path: str, competition_id: int):
    """
    1. xlsx parse et
    2. Takım ve katılımcıları DB'ye kaydet
    3. Her katılımcı için User oluştur
    4. MagicLink oluştur (24 saat geçerli)
    5. Site ayarlarındaki şablonla e-posta gönder
    """
```

---

## 5. KATILIMCı ONBOARDING ADIMLARI

Magic link → TC + Takım ID girişi → Sistem sırayla sorar:

### Adım 1 — Ulaşım tercihi
```
Yarışmaya nasıl geleceksiniz?
[ ] Uçak        → Vakıf bileti alacak
[ ] Otobüs      → Fatura yükleyeceksiniz
[ ] Tren        → Fatura yükleyeceksiniz
[ ] Kendi İmkanımla → Destek verilmeyecek
```

### Adım 2A — UÇAK seçtiyse
```
Tercih geliş tarihi: [date picker — arrival_earliest ile arrival_latest arası]
Tercih dönüş tarihi: [date picker — departure_earliest ile departure_latest arası]
Telefon: [input]
Not: [textarea — opsiyonel]
→ Admin panelde "Uçak Bileti Alınacaklar" listesine düşer
```

### Adım 2B — OTOBÜS / TREN seçtiyse
```
Nereden kalkacaksınız? [şehir]
Banka adı: [input]
Hesap sahibi adı soyadı: [input — kendisi veya aynı soyadlı ebeveyn]
IBAN: [input — TR ile başlamalı]
Fatura PDF yükle: [multi file upload]
→ AI her faturayı okur → validasyon çalışır → sonuç
```

### Adım 2C — KENDİ İMKANIMLA seçtiyse
```
"Anlaşıldı, ulaşım desteği verilmeyecektir."
→ Kayıt düşülür, biter.
```

### Adım 3 — Süreç takibi (her zaman görünür)
```
✅ Ulaşım tercihi seçildi
✅ Bilgiler girildi
⏳ Fatura inceleniyor
○  Sonuç
```

---

## 6. KAPTAN FARKI

Kaptan giriş yaptığında:
- Kendi sürecini tamamlar
- Takım üyelerinin listesini + durumunu görür
- Üye adına fatura yükleyebilir
- Üye adına bilgi girebilir

```python
# Endpoint
POST /api/v1/captain/upload-invoice/
body: { participant_id: int, invoice_file: File }
# Sadece captain rolü, sadece kendi takımı için
```

---

## 7. AI ENTEGRASYONU — core/ai_client.py

```python
class ClaudeAIClient:
    def __init__(self):
        self.client = anthropic.Anthropic()
        self.model = settings.ANTHROPIC_MODEL

    def extract_invoice(self, file_path: str, participant_name: str, competition) -> dict:
        """PDF faturadan bilgi çıkar. Döner: {amount, date, owner_name, transport_type, origin, destination, confidence}"""

    def answer_faq(self, question: str, faq_content: str, language: str = 'tr') -> dict:
        """SSS'ten soruyu cevapla. Döner: {answer, confidence, can_answer}"""

    def translate_keys(self, keys: dict, target_language: str) -> dict:
        """Türkçe metinleri hedef dile çevir. Admin yeni dil ekleyince çağrılır."""

    def assist_upload(self, user_message: str, context: dict) -> str:
        """Katılımcı fatura yüklerken yardım ister, sistem bağlamında cevap ver."""
```

### AI confidence kuralı:
- `confidence >= 0.7` → Otomatik validasyon
- `confidence < 0.7` → Manuel incelemeye al, admin panelde bildir

---

## 8. SSS + WEBSOCKET AKIŞI

```python
# faq/views.py — FAQChatView
def post(self, request):
    # 1. SSS belgelerini yükle
    # 2. AI'a sor
    # 3. can_answer=True → cevap döndür
    # 4. can_answer=False:
    #    - FAQConversation.escalated_to_admin = True kaydet
    #    - WebSocket ile admine bildir:
    #      {'type': 'faq_escalation', 'participant': ..., 'question': ...}
    #    - "Sorunuz adminine iletildi" döndür
```

```python
# notifications/consumers.py
class AdminNotificationConsumer(AsyncWebsocketConsumer):
    # Sadece admin/superadmin bağlanabilir
    # Bildirim tipleri:
    # - faq_escalation: AI cevaplayamadı
    # - new_invoice: Yeni fatura yüklendi
    # - invoice_result: Validasyon sonucu

class ParticipantStatusConsumer(AsyncWebsocketConsumer):
    # Katılımcıya süreç güncellemesi gönder
```

---

## 9. KURAL MOTORU — validation/engine.py

```python
class ValidationEngine:
    def validate(self, invoice: Invoice) -> dict:
        """Aktif kuralları öncelik sırasıyla çalıştır. {approved, errors} döner."""

    # Handler'lar:
    def _rule_check_support_scope(...)      # Destek kapsamında mı?
    def _rule_check_plane_conflict(...)     # Uçak seçmişse fatura yükleyemez
    def _rule_check_transport_type(...)     # Sadece otobüs/tren kabul
    def _rule_check_amount_validity(...)    # Tutar > 0
    def _rule_check_invoice_owner(...)      # Fatura sahibi = katılımcı veya aynı soyadlı ebeveyn
    def _rule_check_invoice_date(...)       # Tarih arrival_earliest-departure_latest arasında
    def _rule_check_duplicate(...)          # Aynı tarih+tutar daha önce onaylanmış mı?
    def _rule_check_iban(...)               # Dijital cüzdan değil, TR IBAN
```

---

## 10. EXCEL RAPORLARI

### Rapor 1 — Sonuç Raporu
| Sıra | Yarışma | Ad | Soyad | TC | Ulaşım Tipi | Fatura Durumu | Hatalar | Karar | Red Nedeni |

### Rapor 2 — Ödeme Raporu (sadece onaylananlar)
| Sayı | Hesap Sahibi | TC | Banka | IBAN | Tutar | Açıklama |
Açıklama: `TEKNOFEST {yıl} {yarışma_adı} BİLET ÖDEMESİ`

### Rapor 3 — Uçak Listesi
| Ad Soyad | TC | E-posta | Telefon | Tercih Geliş | Tercih Dönüş | Notlar |

---

## 11. ÇOK DİL SİSTEMİ

### Başlangıç dilleri: Türkçe, İngilizce, Arapça (RTL)

### Admin yeni dil eklediğinde:
```python
# 1. Mevcut TR çevirilerini al
# 2. Claude API ile otomatik çevir
# 3. DB'ye kaydet (auto_translated=True)
# 4. Frontend JSON dosyasını güncelle
```

### Frontend:
- next-intl kullan
- Her metin `t('key')` şeklinde
- Arapça → `dir="rtl"` otomatik
- Dil seçici header'da her zaman görünür

---

## 12. UI / UX

### Tasarım
- **Stil:** Modern card-based, hafif gölge, depth
- **Tema:** Dark/Light — sistem tercihine göre, manuel toggle
- **Font:** Inter
- **Renkler:** CSS variables, admin panelden değiştirilebilir
- **Animasyonlar:** Framer Motion — sayfa geçişleri, kart animasyonları

### Katılımcı tarafı (mobil öncelikli, 375px)
```
Header: [Logo] [Site adı] [Dil seçici]
İçerik: Adım adım form (wizard)
Footer: AI asistan butonu (floating, sağ alt)
```

### AI Asistan Widget
- Sağ alt köşe, floating chat ikonu
- Tıklayınca slide-up chat açılır
- SSS'ten cevap verir
- Cevaplayamazsa: "Adminine ilettim, kısa sürede yanıt alacaksınız"
- Admin panelde WebSocket bildirimi çıkar

### Admin tarafı
```
Sidebar: Dashboard | Yarışmalar | Katılımcılar | Faturalar | 
         Kurallar | SSS | Diller | Bildirimler🔴 | Ayarlar | Raporlar

Dashboard kartları: Toplam | Onaylanan | Reddedilen | Bekleyen | Uçak listesi
```

### Admin Bildirim Paneli (WebSocket)
- 🔴 SSS escalation — "Ali Yılmaz bir soru sordu, cevaplanamadı"
- 📄 Yeni fatura yüklendi
- ⚠️ Düşük AI confidence — manuel inceleme gerekiyor

---

## 13. API ENDPOINTLERİ

```
# Auth
POST /api/v1/auth/magic-link/request/
POST /api/v1/auth/magic-link/verify/
POST /api/v1/auth/login/            # TC + Takım ID
POST /api/v1/auth/refresh/

# Katılımcı
GET  /api/v1/me/
GET  /api/v1/me/status/
POST /api/v1/transport/select/
POST /api/v1/transport/details/
POST /api/v1/invoices/upload/
GET  /api/v1/invoices/
POST /api/v1/faq/ask/
GET  /api/v1/faq/history/

# Kaptan
GET  /api/v1/captain/team/
POST /api/v1/captain/upload-invoice/

# Admin — Yarışma
GET,POST        /api/v1/admin/competitions/
GET,PUT,DELETE  /api/v1/admin/competitions/{id}/
POST            /api/v1/admin/competitions/{id}/upload-participants/
POST            /api/v1/admin/competitions/{id}/send-magic-links/

# Admin — Katılımcı & Fatura
GET             /api/v1/admin/participants/
GET             /api/v1/admin/invoices/
PATCH           /api/v1/admin/invoices/{id}/manual-review/

# Admin — Raporlar
GET /api/v1/admin/reports/result/
GET /api/v1/admin/reports/payment/
GET /api/v1/admin/reports/flights/

# Admin — SSS
GET,POST /api/v1/admin/faq/documents/
GET      /api/v1/admin/faq/escalations/
POST     /api/v1/admin/faq/escalations/{id}/respond/

# Admin — Dil
GET,POST /api/v1/admin/languages/
POST     /api/v1/admin/languages/{code}/auto-translate/
GET,PUT  /api/v1/admin/languages/{code}/translations/

# Admin — Ayarlar
GET,PUT  /api/v1/admin/settings/     # Logo, renkler, SMTP, mail şablonu
GET,PUT  /api/v1/admin/rules/
GET,PUT  /api/v1/admin/modules/
GET      /api/v1/admin/audit/
```

---

## 14. ORTAM DEĞİŞKENLERİ

```env
# backend
SECRET_KEY=...
DEBUG=False
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
ALLOWED_HOSTS=*.railway.app,localhost
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
FRONTEND_URL=https://your-app.vercel.app
SEED_ADMIN_PASSWORD=...

# frontend
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
NEXT_PUBLIC_WS_URL=wss://your-backend.railway.app/ws
NEXT_PUBLIC_DEFAULT_LOCALE=tr
```

---

## 15. SEED

```python
# 1. Superadmin — admin / SEED_ADMIN_PASSWORD
# 2. SiteSettings — pk=1, default değerler
# 3. Diller — tr, en, ar
# 4. ValidationRule'lar — 8 kural, hepsi aktif
#    check_support_scope (p:10, blocking)
#    check_plane_conflict (p:20, blocking)
#    check_transport_type (p:30)
#    check_amount_validity (p:40)
#    check_invoice_owner (p:50)
#    check_invoice_date (p:60)
#    check_duplicate (p:70)
#    check_iban (p:80)
# 5. Demo yarışma — slug: demo-2025
```

---

## 16. GELİŞTİRME SIRASI

1. Django projesi + Channels + Redis kurulumu
2. Tüm modeller + migration
3. Seed komutu
4. Core AI client (4 metot)
5. Auth — magic link + TC/TakımID login
6. XLSX parser + onboarding akışı
7. Transport akışı
8. Invoice akışı + AI analiz
9. Kural motoru
10. Excel raporları
11. WebSocket consumers
12. SSS sistemi + escalation
13. i18n sistemi + auto-translate
14. Admin API endpoint'leri
15. Kaptan endpoint'leri
16. Next.js — katılımcı tarafı (mobil öncelikli)
17. Next.js — admin paneli
18. next-intl entegrasyonu
19. WebSocket frontend
20. AI asistan floating widget
21. Deploy — Dockerfile, Railway, Vercel

---

## 17. ÖNEMLİ NOTLAR

- Kaptan üye adına yükler ama her fatura ayrı kişiye atanır
- Uçak seçen fatura yükleyemez ama tarih + telefon bilgisi girer
- max_supported_members aşılırsa sonraki kişiler reddedilir
- IBAN: kişinin kendisi veya aynı soyadlı ebeveyn
- Tüm site metinleri i18n key ile, hardcode Türkçe yok
- CSS primary/secondary değişken — admin değiştirince anında yansır
- AI confidence < 0.7 → manuel inceleme, admin bildirimi
- WebSocket kopunca otomatik reconnect
