# TEKNOFEST Bilet Kontrol Sistemi

Django 4.2 + DRF backend ve Next.js 14 (App Router) frontend ile modüler ulaşım faturası doğrulama uygulaması.

## Yerel çalıştırma

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env   # düzenleyin
python manage.py migrate
python manage.py seed
python manage.py runserver
```

API: `http://127.0.0.1:8000/api/v1/`  
Varsayılan admin: `admin` / `admin` (üretimde `SEED_ADMIN_PASSWORD` ile değiştirin).

### Frontend

```bash
cd frontend
copy .env.local.example .env.local
npm install
npm run dev
```

`NEXT_PUBLIC_API_URL` backend adresinize işaret etmeli.

### Vercel

Yeni projede **Root Directory** olarak `frontend` seçin. Ortam değişkeni: `NEXT_PUBLIC_API_URL`.

### Railway (backend + PostgreSQL)

- **Root Directory:** `backend`
- **Start:** Dockerfile veya `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`
- Ortam: `DATABASE_URL`, `SECRET_KEY`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `ANTHROPIC_API_KEY`

Medya dosyaları için Railway Volume veya S3 benzeri depolama önerilir.

---

## Mimari Kararlar

### Neden modüler?

Sistemin çekirdeği (kural motoru, AI extractor, rapor üretici) değişmez. Entegrasyonlar plug-in olarak eklenir. KYS modülü etkinleştirildiğinde katılımcı verileri otomatik senkronize edilir; devre dışı bırakıldığında sistem manuel dosya yükleme ile çalışmaya devam eder.

### Neden KYS entegrasyonu?

T3 Vakfı'nın mevcut KYS sistemi Django tabanlıdır. Bizim backend'imiz de Django kullandığından entegrasyon API katmanında doğal olarak gerçekleşir. Katılımcı verileri, destek hak edişleri ve takım bilgileri KYS'den otomatik çekilebilir hale getirilmiştir (şu an istemci stub).

### Neden Claude API?

Fatura PDF'leri farklı firmalardan, farklı formatlarda gelir. Sabit regex/parser yerine LLM tabanlı belge anlama katmanı kullanarak format bağımsız extraction sağladık. Kural motoru ise Claude'dan bağımsız olarak deterministik çalışır — AI sadece veri çıkarır, karar vermez.

### Neden dinamik kural sistemi?

Her yarışma için farklı kurallar gerekebilir. Admin panelden kod deploy etmeden kural aktif/pasif edilebilir, öncelik değiştirilebilir.

---

## API özeti

| Alan | Örnek |
|------|--------|
| Giriş | `POST /api/v1/auth/login/` |
| Yarışmalar (herkese açık) | `GET /api/v1/competitions/` |
| Oturum | `POST /api/v1/sessions/` (multipart) |
| Admin | `GET /api/v1/admin/...` (JWT, operatör+) |

---

## Geliştirme notları

- Yeni modül: `BaseModule` + `@ModuleRegistry.register`, ardından `python manage.py seed` ile DB kaydı (veya admin üzerinden).
- Yeni kural: `ValidationEngine` içinde `_rule_<kural_adı>` + `ValidationRule` kaydı.
- Anonim kullanıcı oturumu: JWT olmadan `sessions` oluşturulabilir; token varsa `created_by` dolar.
