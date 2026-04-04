# TEKNOFEST Bilet Kontrol — Düzeltme Prompt'u

Bu prompt mevcut sistemi gerçek Excel formatına göre düzeltmek için Cursor'a verilecek.
Mevcut kod tabanını koru, sadece aşağıdaki değişiklikleri uygula.

---

## 1. GERÇEK DOSYA FORMATLARI

Sistem iki ayrı Excel/CSV dosyası alıyor:

### Dosya 1: Destek Talep Raporu (KYS'den geliyor)
Sütunlar (bu sırayla parse et):
```
basvuru, Ad, Soyad, Email, UlaşımveKonaklamaDestekTalebi, SeyahatTipi,
TakimUyeID, TakımÜyesiAd, TakımÜyesiSoyad, TakımÜyesiMail, TakımÜyesiTC,
KatılacağıŞehir, DöneceğiŞehir, İletişimNo, DoğumTarihi, Cinsiyet,
KendiGelecekKişiSayısı, takim_id, takim_adi, program_adi, durum_adi,
kendi_karsilayacak, destek_turu_id, UserNote
```

**Önemli alanlar:**
- `SeyahatTipi`: "Uçak" / "Tren" / "Otobüs" / "Kendi İmkanımla" değerlerini alır
- `UlaşımveKonaklamaDestekTalebi`: Katılımcının talep metni (ulaşım istiyor mu?)
- `TakımÜyesiTC`: Katılımcının TC kimlik numarası
- `kendi_karsilayacak`: TRUE ise kendi karşılıyor, destek istemiyordur
- `takim_adi`: Takım adı
- `program_adi`: Yarışma adı

**Parse kuralları:**
- `SeyahatTipi` == "Uçak" → `transport_type = 'plane'`
- `SeyahatTipi` == "Tren" → `transport_type = 'train'`
- `SeyahatTipi` == "Otobüs" → `transport_type = 'bus'`
- `SeyahatTipi` == "Kendi İmkanımla" veya None → `transport_type = 'none'`
- `kendi_karsilayacak` == TRUE veya `UlaşımveKonaklamaDestekTalebi` boş → `is_supported = False`
- Ulaşım kelimesi içeren talep metni → `is_supported = True`

### Dosya 2: Bilet Ödeme Talep Dosyası (Katılımcıların doldurduğu Google Form)
Sütunlar:
```
Zaman damgası, YARIŞMA, Takım Adı, Başvuru ID, Ad-Soyad,
T.C. Kimlik Numarası, Telefon Numarası, E-Mail Adresi,
Ulaşım Aracı, Tutar, Fatura (Google Drive linki veya dosya),
Banka Adı, Hesap Sahibinin Adı-Soyadı,
Hesap Sahibinin T.C. Kimlik Numarası, IBAN, DURUM, NEDEN
```

**Önemli alanlar:**
- `Ulaşım Aracı`: "Otobüs" / "Tren" / "Uçak" vb.
- `Tutar`: Sayısal, TL cinsinden
- `Fatura`: Google Drive linki VEYA yüklenmiş PDF dosyası
- `IBAN`: TR ile başlamalı
- `Banka Adı`: Dijital cüzdan kontrolü için
- `Hesap Sahibinin Adı-Soyadı`: IBAN sahibi kontrolü için

---

## 2. PARSE SERVİSİ — `tickets/parsers.py`

Mevcut parser'ı tamamen şununla değiştir:

```python
import pandas as pd
from datetime import datetime

class SupportRequestParser:
    """Destek Talep Raporu (KYS çıktısı) parser'ı"""

    TRANSPORT_MAP = {
        'uçak': 'plane',
        'tren': 'train',
        'otobüs': 'bus',
        'otobus': 'bus',
        'kendi imkanımla': 'none',
        'kendi imkanimla': 'none',
    }

    def parse(self, file_path: str) -> list[dict]:
        """
        Excel/CSV dosyasını okur, katılımcı listesi döner.
        Her dict bir katılımcıyı temsil eder.
        """
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path, dtype=str)
        else:
            df = pd.read_excel(file_path, dtype=str)

        # Başlık satırını bul (bazen ilk satır değil)
        header_row = self._find_header_row(df)
        if header_row > 0:
            df = pd.read_excel(file_path, header=header_row, dtype=str)

        participants = []
        for _, row in df.iterrows():
            # Boş satırları atla
            if pd.isna(row.get('TakımÜyesiTC', None)) or str(row.get('TakımÜyesiTC', '')).strip() == '':
                continue

            transport_raw = str(row.get('SeyahatTipi', '')).strip().lower()
            transport_type = self.TRANSPORT_MAP.get(transport_raw, 'none')

            talep = str(row.get('UlaşımveKonaklamaDestekTalebi', '')).lower()
            kendi = str(row.get('kendi_karsilayacak', '')).upper()
            is_supported = (
                'ulaşım' in talep or 'ulasim' in talep
            ) and kendi != 'TRUE'

            participants.append({
                'full_name': f"{row.get('Ad', '')} {row.get('Soyad', '')}".strip(),
                'email': row.get('Email', ''),
                'tc_id': str(row.get('TakımÜyesiTC', '')).strip().split('.')[0],  # float temizle
                'phone': str(row.get('İletişimNo', '')).strip().split('.')[0],
                'transport_type': transport_type,
                'is_supported': is_supported,
                'team_name': row.get('takim_adi', ''),
                'competition_name': row.get('program_adi', ''),
                'city_from': row.get('KatılacağıŞehir', ''),
                'city_to': row.get('DöneceğiŞehir', ''),
                'kys_member_id': str(row.get('TakimUyeID', '')).strip().split('.')[0],
            })

        return participants

    def _find_header_row(self, df) -> int:
        """TakımÜyesiTC sütununu hangi satırda olduğunu bul"""
        for i, row in df.iterrows():
            if 'TakımÜyesiTC' in str(row.values) or 'TakimUyeID' in str(row.values):
                return i
        return 0


class PaymentRequestParser:
    """Bilet Ödeme Talep Dosyası parser'ı"""

    TRANSPORT_MAP = {
        'otobüs': 'bus', 'otobus': 'bus',
        'tren': 'train',
        'uçak': 'plane', 'ucak': 'plane',
    }

    DIGITAL_WALLETS = ['papara', 'tosla', 'paycell', 'ininal', 'hayat finans', 'param']

    def parse(self, file_path: str) -> list[dict]:
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path, dtype=str)
        else:
            df = pd.read_excel(file_path, dtype=str)

        submissions = []
        for _, row in df.iterrows():
            tc = str(row.get('T.C. Kimlik Numarası', '')).strip().split('.')[0]
            if not tc or tc == 'nan':
                continue

            tutar_raw = str(row.get('Geliş-dönüş biletlerinizin toplam tutarını yazınız. (Örn: 1000)', '')).strip()
            # Alternatif sütun adları dene
            if tutar_raw == 'nan':
                tutar_raw = str(row.get('Tutar', '')).strip()

            try:
                amount = float(tutar_raw.replace(',', '.').replace(' ', ''))
            except:
                amount = None

            fatura_col = None
            for col in row.index:
                if 'fatura' in col.lower() or 'dosya' in col.lower() or 'yükle' in col.lower():
                    fatura_col = col
                    break

            fatura_value = str(row.get(fatura_col, '')).strip() if fatura_col else ''
            is_drive_link = fatura_value.startswith('http') and 'drive.google' in fatura_value

            transport_raw = str(row.get('Ulaşım Aracı', '')).strip().lower()

            bank_name = str(row.get('Banka Adı', '')).strip()
            is_digital = any(w in bank_name.lower() for w in self.DIGITAL_WALLETS)

            submissions.append({
                'full_name': str(row.get('Ad-Soyad', '')).strip(),
                'tc_id': tc,
                'phone': str(row.get('Telefon Numarası', '')).strip(),
                'email': str(row.get('E-Mail Adresi', '')).strip(),
                'competition_name': str(row.get('YARIŞMA', '')).strip(),
                'team_name': str(row.get('Takım Adı', '')).strip(),
                'basvuru_id': str(row.get('Başvuru ID', '')).strip().split('.')[0],
                'transport_type_declared': self.TRANSPORT_MAP.get(transport_raw, 'other'),
                'amount': amount,
                'invoice_source': 'drive_link' if is_drive_link else 'file_upload',
                'invoice_drive_link': fatura_value if is_drive_link else None,
                'bank_name': bank_name,
                'account_holder_name': str(row.get('Hesap Sahibinin Adı-Soyadı', '')).strip(),
                'account_holder_tc': str(row.get('Hesap Sahibinin T.C. Kimlik Numarası', '')).strip().split('.')[0],
                'iban': str(row.get('IBAN bilgilerinizi giriniz. \n\n*TR hesap bilgilerini girmenizi rica ederiz.', '')).strip(),
                'is_digital_wallet': is_digital,
                'existing_status': str(row.get('DURUM', '')).strip(),
                'existing_reason': str(row.get('NEDEN', '')).strip(),
            })

        return submissions
```

---

## 3. ANA ANALİZ AKIŞI — `tickets/views.py`

Session oluşturma view'ını şu akışa göre yeniden yaz:

```python
def analyze_session(session_id):
    """
    Analiz akışı:
    1. Destek talep dosyasını parse et → katılımcı listesi
    2. Ödeme talep dosyasını parse et → başvuru listesi
    3. TC bazlı eşleştir
    4. Her başvuru için:
       a. Fatura: Drive linki mi? → AI ile analiz (link'ten PDF çek veya metadata)
                  Dosya mı? → AI ile PDF analiz
       b. ValidationEngine çalıştır
       c. Sonucu kaydet
    5. Excel raporları üret
    6. E-posta bildirimi gönder (modül aktifse)
    """

    session = AnalysisSession.objects.get(id=session_id)
    session.status = 'processing'
    session.save()

    # 1. Parse
    support_parser = SupportRequestParser()
    payment_parser = PaymentRequestParser()

    participants_data = support_parser.parse(session.transport_request_file.path)
    submissions_data = payment_parser.parse(session.ticket_payment_file.path)

    # 2. Katılımcıları DB'ye kaydet / güncelle
    competition = session.competition
    team, _ = Team.objects.get_or_create(
        name=participants_data[0]['team_name'] if participants_data else 'Bilinmiyor',
        competition=competition
    )

    participants_by_tc = {}
    for p_data in participants_data:
        participant, _ = Participant.objects.update_or_create(
            tc_id=p_data['tc_id'],
            team=team,
            defaults={
                'full_name': p_data['full_name'],
                'email': p_data['email'],
                'transport_type': p_data['transport_type'],
                'is_supported': p_data['is_supported'],
            }
        )
        participants_by_tc[p_data['tc_id']] = participant

    # 3. Destek kapsamı sınırı uygula
    supported_participants = [p for p in participants_by_tc.values() if p.is_supported]
    max_count = competition.max_supported_members
    if len(supported_participants) > max_count:
        # Fazladan olanları kapsam dışı yap
        for p in supported_participants[max_count:]:
            p.is_supported = False
            p.save()

    # 4. Her ödeme başvurusu için validasyon
    engine = ValidationEngine()
    approved_count = 0
    rejected_count = 0
    total_amount = 0

    for sub_data in submissions_data:
        tc = sub_data['tc_id']
        participant = participants_by_tc.get(tc)

        submission = TicketSubmission.objects.create(
            session=session,
            participant=participant if participant else None,
            invoice_amount=sub_data['amount'],
            invoice_drive_link=sub_data.get('invoice_drive_link'),
        )

        # Fatura analizi (AI)
        if sub_data['invoice_source'] == 'file_upload' and submission.invoice_file:
            extractor = InvoiceExtractor()
            extracted = extractor.extract(submission.invoice_file.path)
            submission.ai_extracted_data = extracted
            submission.invoice_date = extracted.get('date')
            submission.invoice_owner_name = extracted.get('owner_name', '')
            submission.transport_type_on_invoice = extracted.get('transport_type', '')

        # Validasyon
        if not participant:
            result = {'approved': False, 'errors': ['Katılımcı destek talep dosyasında bulunamadı']}
        else:
            # IBAN bilgisini ödeme dosyasından al
            participant.iban = sub_data['iban']
            participant.bank_name = sub_data['bank_name']
            participant.account_holder_name = sub_data['account_holder_name']
            participant.save()

            result = engine.validate(submission, participant, competition)

        submission.status = 'approved' if result['approved'] else 'rejected'
        submission.rejection_reasons = result['errors']
        submission.validated_at = datetime.now()
        submission.save()

        if result['approved']:
            approved_count += 1
            total_amount += float(sub_data['amount'] or 0)
        else:
            rejected_count += 1

    session.status = 'completed'
    session.completed_at = datetime.now()
    session.summary = {
        'total': len(submissions_data),
        'approved': approved_count,
        'rejected': rejected_count,
        'total_amount': total_amount,
    }
    session.save()
```

---

## 4. MODEL DEĞİŞİKLİKLERİ

### TicketSubmission modeline ekle:
```python
invoice_drive_link = models.URLField(blank=True, null=True)   # Google Drive linki
account_holder_tc = models.CharField(max_length=11, blank=True)  # IBAN sahibi TC
basvuru_id = models.CharField(max_length=50, blank=True)      # KYS başvuru ID
```

### Participant modeline ekle:
```python
phone = models.CharField(max_length=20, blank=True)
city_from = models.CharField(max_length=100, blank=True)
city_to = models.CharField(max_length=100, blank=True)
kys_member_id = models.CharField(max_length=50, blank=True)
```

Migration oluştur: `python manage.py makemigrations && python manage.py migrate`

---

## 5. VALİDASYON KURALI GÜNCELLEMESİ

### `_rule_check_iban` kuralını güncelle — IBAN sahibi kontrolü:

```python
def _rule_check_invoice_owner(self, submission, participant, competition, config):
    """
    IBAN sahibi kontrolü:
    - Kişinin kendi adına olabilir
    - Aynı soyadlı ebeveyn adına olabilir
    """
    account_holder = participant.account_holder_name.lower().strip()
    participant_name = participant.full_name.lower().strip()
    participant_surname = participant_name.split()[-1] if participant_name else ''

    if not account_holder:
        return {'passed': False, 'message': 'Hesap sahibi adı boş'}

    # Tam ad eşleşmesi
    if participant_name in account_holder or account_holder in participant_name:
        return {'passed': True}

    # Soyad eşleşmesi (ebeveyn kontrolü)
    if participant_surname and participant_surname in account_holder:
        return {'passed': True}

    return {
        'passed': False,
        'message': f'IBAN sahibi ({participant.account_holder_name}) katılımcı adı veya soyadıyla eşleşmiyor'
    }
```

---

## 6. EXCEL RAPOR ÇIKTISI GÜNCELLEMESİ

### Sonuç Raporu sütunları (NİHAİ SONUÇ RAPORU formatına göre):
```python
RESULT_COLUMNS = [
    {'key': 'order',           'label': 'Sıra'},
    {'key': 'competition',     'label': 'Yarışma Adı'},
    {'key': 'first_name',      'label': 'Ad'},
    {'key': 'last_name',       'label': 'Soyad'},
    {'key': 'email',           'label': 'Email'},
    {'key': 'phone',           'label': 'Telefon Numarası'},
    {'key': 'tc_id',           'label': 'TC'},
    {'key': 'transport_type',  'label': 'Ulaşım tipi'},
    {'key': 'invoice_status',  'label': 'Fatura durumu'},
    {'key': 'errors',          'label': 'Tespit edilen hatalar'},
    {'key': 'decision',        'label': 'Nihai karar (Onay / Red)'},
    {'key': 'rejection_reason','label': 'Red nedeni (varsa)'},
]
```

### Ödeme Raporu sütunları (BEKLENEN NİHAİ ÖDEME DOSYASI formatına göre):
```python
PAYMENT_COLUMNS = [
    {'key': 'order',                'label': 'Sayı'},
    {'key': 'account_holder_name',  'label': 'Hesap Sahibinin Adı-Soyadı'},
    {'key': 'account_holder_tc',    'label': 'Hesap Sahibinin T.C. Kimlik Numarası'},
    {'key': 'bank_name',            'label': 'Banka Adı'},
    {'key': 'iban',                 'label': 'IBAN'},
    {'key': 'amount',               'label': 'Tutar'},
    {'key': 'description',          'label': 'Açıklama'},
]
# Açıklama formatı: "TEKNOFEST 2025 {yarışma_adı} BİLET ÖDEMESİ"
```

---

## 7. FRONTEND DEĞİŞİKLİKLERİ — `frontend/app/(user)/page.tsx`

Upload formunu şu şekilde güncelle:

### Yeni form alanları:
```
1. Yarışma adı (text input)
2. Desteklenecek kişi sayısı (number input)
3. Destek Talep Raporu → xlsx/csv yükle (KYS'den indirilen dosya)
4. Bilet Ödeme Talep Dosyası → xlsx/csv yükle (Google Form çıktısı)
5. Fatura PDF'leri → Çoklu dosya yükle (opsiyonel, Drive linki yoksa)
```

### UI metinlerini güncelle:
```tsx
// Talep dosyası alanı
<p className="font-medium">Destek Talep Raporu</p>
<p className="text-sm text-gray-500">KYS'den indirilen Excel/CSV dosyası</p>

// Ödeme talep dosyası alanı
<p className="font-medium">Bilet Ödeme Talep Dosyası</p>
<p className="text-sm text-gray-500">Google Form çıktısı (Excel/CSV)</p>

// Fatura alanı
<p className="font-medium">Fatura PDF'leri</p>
<p className="text-sm text-gray-500">
  Opsiyonel — Ödeme talep dosyasında Drive linki yoksa yükleyin
</p>
```

### Yarışma dropdown'u:
Yarışma listesini backend'den çek: `GET /api/v1/competitions/`
Dropdown boşsa "Yarışma bulunamadı, admin panelinden ekleyin" göster.
Listeye "Manuel gir" seçeneği ekle → text input açılır.

---

## 8. YARIŞMA LİSTESİ — SEED GÜNCELLEMESİ

`management/commands/seed.py` dosyasına TEKNOFEST 2025 yarışmalarını ekle:

```python
competitions = [
    {'name': 'TEKNOFEST 2025 Savaşan İHA', 'slug': 'savasan-iha-2025', 'start_date': '2025-09-01', 'end_date': '2025-09-07'},
    {'name': 'TEKNOFEST 2025 Akıllı Ulaşım', 'slug': 'akilli-ulasim-2025', 'start_date': '2025-09-01', 'end_date': '2025-09-07'},
    {'name': 'TEKNOFEST 2025 Tarım', 'slug': 'tarim-2025', 'start_date': '2025-09-01', 'end_date': '2025-09-07'},
    {'name': 'DENEME', 'slug': 'deneme', 'start_date': '2025-01-01', 'end_date': '2025-12-31'},
]
for c in competitions:
    Competition.objects.get_or_create(slug=c['slug'], defaults={
        'name': c['name'],
        'start_date': c['start_date'],
        'end_date': c['end_date'],
        'max_supported_members': 5,
        'is_active': True,
    })
```

---

## 9. HATA DÜZELTME — CORS / API BAĞLANTISI

`config/settings/production.py` dosyasını kontrol et:

```python
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[])
CORS_ALLOW_ALL_ORIGINS = env.bool('CORS_ALLOW_ALL_ORIGINS', default=False)

# Geliştirme için geçici — production'da kaldır:
if not CORS_ALLOWED_ORIGINS:
    CORS_ALLOW_ALL_ORIGINS = True
```

`ALLOWED_HOSTS` şu şekilde olsun:
```python
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['*'])
```

---

## 10. GELİŞTİRME SIRASI

1. Model değişikliklerini yap → `makemigrations` → `migrate`
2. `tickets/parsers.py` dosyasını yaz
3. Ana analiz akışını güncelle
4. Validasyon kurallarını güncelle (IBAN sahibi)
5. Excel rapor sütunlarını güncelle
6. Seed'e yarışmaları ekle → Railway'de `python manage.py seed` çalıştır
7. Frontend form alanlarını güncelle
8. CORS ayarlarını düzelt
9. Deploy → test

---

## TEST SENARYOSU

Deploy sonrası şu senaryoyu test et:

Excel'deki örnek verilerden:
- `İbrahim Eren Seven` → Otobüs, 4000 TL, Ziraat Bankası → **Onaylı** olmalı
- `Asude Nur Karaavcı` → Otobüs, 1900 TL, durum "❌ Hata" → **Reddedildi** olmalı
- `ŞEVVAL ALİM` → Birden fazla kişiyi tek formda göndermiş → **Reddedildi** olmalı (ayrı ayrı yüklenmeli)
