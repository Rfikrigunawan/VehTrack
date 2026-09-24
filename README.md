# 🚗 Vehicle Tracker

> **Smart tracking system** untuk mengelola kendaraan pribadi: servis, BBM, dokumen, pengingat, dan laporan — dalam satu aplikasi terintegrasi.

[![Version](https://img.shields.io/badge/version-1.1.1-blue.svg)](https://github.com/)
[![Python](https://img.shields.io/badge/python-3.9%2B-blue)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/flask-3.x-green)](https://flask.palletsprojects.com/)
[![PocketBase](https://img.shields.io/badge/pocketbase-0.22.x-orange)](https://pocketbase.io/)
[![Telegram](https://img.shields.io/badge/telegram-bot%20%2B%20mini%20app-blue)](https://telegram.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## 📋 Daftar Isi

1. [Apa yang Baru](#-apa-yang-baru)
2. [Fitur Utama](#-fitur-utama)
3. [Arsitektur](#-arsitektur)
4. [Struktur Project](#-struktur-project)
5. [Instalasi](#-instalasi)
6. [Konfigurasi](#-konfigurasi)
7. [Menjalankan Aplikasi](#-menjalankan-aplikasi)
8. [Registrasi via Bot Telegram](#-registrasi-via-bot-telegram)
9. [Telegram Integration](#-telegram-integration)
10. [Struktur Database](#-struktur-database)
11. [API Reference](#-api-reference)
12. [Design System](#-design-system)
13. [Keamanan](#-keamanan)
14. [Development](#-development)
15. [Deployment](#-deployment)
16. [Troubleshooting](#-troubleshooting)
17. [Changelog](#-changelog)
18. [Roadmap](#-roadmap)
19. [Lisensi](#-lisensi)

---

## 🆕 Apa yang Baru

### v1.1.1 — UI Polish & Bug Fixes (Latest)

**✨ UI Improvements:**
- 🎨 **Login Page Redesign** — hero icon dengan animasi floating + shimmer, staggered entrance
- 📐 **Settings Grid Layout** — 2 kolom di desktop, stack di mobile (fix ruang kosong)
- 🎯 **Profile Hero** — avatar inisial + nama & email prominent
- 🔘 **Button System Overhaul** — 13+ varian lengkap (solid + outline + special)
- 🌓 **Light Mode Fix** — detail page hardcoded colors diperbaiki
- 📱 **Responsive Polish** — semua halaman lebih rapih di berbagai ukuran layar

**🐛 Bug Fixes:**
- Fix icon "Biaya per KM" tidak muncul (`fa-signpost` → `fa-route`, Pro → Free)
- Fix warna aneh di Detail Kendaraan saat light mode
- Fix tombol "Catat Servis" & "Isi BBM" tidak kontras di light mode
- Fix layout Settings terlihat kosong di desktop
- Fix divider "ATAU" terlalu besar di login page

**🔧 Technical:**
- Password policy: **minimal 8 karakter** (standar PocketBase)
- `change-password`: tambah field `oldPassword` (PocketBase requirement)
- Auto-logout + redirect setelah ganti password sukses
- Audit icon registry — semua icon sekarang **Font Awesome Free compatible**
- CSS variables lebih konsisten untuk theme-aware colors

### v1.1.0 — Registration & Account Management

- 🤖 **Registrasi via Bot Telegram** — daftar tanpa buka web
- 👤 **Edit Profil** — nama, email, no HP
- 🔐 **Ganti Password** — dengan verifikasi password lama
- 🗑️ **Hapus Akun** — self-service dengan cascade delete
- 📊 **Halaman Laporan** — analisis pengeluaran & konsumsi
- 🛡️ **HMAC Security** — registrasi bot dilindungi anti-replay
- 📝 **Audit Trail** — collection `registration_log`
- 🆕 Bot commands: `/myaccount`, `/stats`, `/broadcast`

### v1.0.0 — Initial Release

- Manajemen kendaraan, servis, BBM, dokumen, pengingat
- Telegram bot + daily reminder @ 08:00 WIB
- Telegram Mini App dengan auto-login
- Dark & light theme
- Responsive design

---

## ✨ Fitur Utama

### 🎯 Core Features

| Fitur | Deskripsi |
|-------|-----------|
| 🚗 **Manajemen Kendaraan** | CRUD kendaraan (motor, mobil, lainnya) dengan foto, spesifikasi, riwayat |
| 🔧 **Catatan Servis** | Riwayat servis rutin, perbaikan, ganti part dengan biaya & nota |
| ⛽ **Catatan BBM** | Tracking pengisian dengan auto-calculate konsumsi (km/L) |
| 📄 **Manajemen Dokumen** | STNK, pajak, asuransi, KIR dengan reminder kadaluarsa |
| 🔔 **Pengingat** | Reminder berbasis KM atau tanggal |
| 📊 **Laporan** | Statistik pengeluaran, konsumsi, top servis, trend bulanan/tahunan |
| 👤 **Akun Management** | Edit profil, ganti password, hapus akun (self-service) |

### 🤖 Telegram Integration

| Fitur | Deskripsi |
|-------|-----------|
| 🤖 **Bot Telegram** | Commands lengkap untuk cek status & reminder |
| 📱 **Mini App** | Dashboard embedded, auto-login via initData |
| 📝 **Registrasi via Bot** | Daftar langsung dari chat, tanpa buka web |
| 🔔 **Daily Reminder** | Notifikasi otomatis jam 08:00 WIB |
| 👨💼 **Admin Commands** | `/stats`, `/broadcast` untuk monitoring |

### 🎨 UI/UX

| Aspek | Detail |
|-------|--------|
| 🌓 **Dark & Light Mode** | Auto-follow system atau toggle manual |
| 💎 **Liquid Glass Effect** | UI modern dengan backdrop blur |
| 🏎️ **HUD Background** | Dekorasi automotive (grid, road, speedometer) |
| 📱 **Responsive** | Optimal di desktop, tablet, HP |
| ✨ **Smooth Animations** | Staggered entrance, hover effects, transitions |
| 🎯 **Font Awesome 6** | Icon modern (100% Free compatible) |
| 📳 **Haptic Feedback** | Getaran di Mini App Telegram |

### 🌐 Multi-Access

Tiga cara akses aplikasi:

1. **Web Browser** — Dashboard lengkap di `https://your-domain.com/app`
2. **Telegram Bot** — Chat commands untuk cek status cepat
3. **Telegram Mini App** — Dashboard embedded, auto-login

---

## 🏗️ Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACES                         │
│                                                             │
│   🌐 Web Browser          📱 Telegram         🤖 Bot Chat  │
│   (app.html)              (teleapp.html)      (commands)   │
│                                                             │
│   🔐 Login Page           ✨ Registrasi via Bot             │
│   (index.html)            (di chat Telegram)                │
└────────────┬────────────────────┬────────────────┬─────────┘
             │                    │                │
             │ HTTP/JSON          │ HTTP/JSON      │ Telegram API
             ▼                    ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                    FLASK BACKEND (app.py)                    │
│                                                              │
│  • Auth (login, register, logout, me)                       │
│  • Registrasi via bot (HMAC-signed)                         │
│  • Update profile, change password, delete account          │
│  • Telegram initData verification                           │
│  • CRUD proxy ke PocketBase                                 │
│  • Business logic (odometer, fuel consumption)              │
│  • File streaming proxy                                     │
│  • SPA routing                                              │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ HTTP (REST)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    POCKETBASE (Database)                     │
│                                                              │
│  • users (auth + extended)                                  │
│  • vehicles, service_records, fuel_logs,                    │
│    documents, reminders                                     │
│  • registration_log (audit)                                 │
│  • File storage                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    TELEGRAM BOT (bot.py)                     │
│                                                              │
│  • Commands: /start, /status, /reminders, /myaccount,       │
│    /link, /unlink, /help, /ping                             │
│  • Admin: /stats, /broadcast                                │
│  • Registrasi via bot (ConversationHandler)                 │
│  • Daily reminder @ 08:00 WIB                               │
│  • Auto-delete password message (60s)                       │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | Python 3.9+ | Language |
| | Flask 3.x | Web framework |
| | requests | HTTP client |
| **Database** | PocketBase 0.22.x | Database + Auth + Files |
| **Bot** | python-telegram-bot 20.x | Telegram API wrapper |
| **Frontend** | Vanilla JavaScript (ES6+) | No framework |
| | Bootstrap 5.3 | Layout & components |
| | Font Awesome 6.5 | Icons (Free) |
| | Flatpickr 4.6 | Date picker |
| | CSS Custom Properties | Theming |

### Design Principles

- **Modular Architecture** — Separate layers (utils, core, layout, views, form)
- **Single Source of Truth** — Icon registry, state management
- **Defense in Depth** — 5 layer security untuk registrasi via bot
- **Progressive Enhancement** — Fallback ke native input
- **Mobile-First** — Responsive breakpoints
- **Accessibility** — ARIA labels, keyboard navigation, reduced-motion
- **Theme-Aware** — CSS variables untuk konsistensi dark/light

---

## 📁 Struktur Project

```
vtrack/
│
├── 📄 app.py                       # Flask backend
├── 📄 bot.py                       # Telegram bot
├── 📄 pocketbase_client.py         # HTTP wrapper
├── 📄 requirements.txt             # Python dependencies
├── 📄 .env                         # Environment (gitignored)
├── 📄 .env.example                 # Template
├── 📄 .gitignore                   # Git ignore
├── 📄 README.md                    # Dokumentasi ini
├── 📄 LICENSE                      # MIT License
│
├── 📂 logs/                        # Auto-created (rotating)
│   ├── app.log
│   └── bot.log
│
├── 📂 templates/                   # Jinja2 templates
│   ├── index.html                  # Login (dengan tombol daftar via bot)
│   ├── app.html                    # Web dashboard
│   └── teleapp.html                # Telegram Mini App
│
└── 📂 static/                      # Static assets
    ├── icon.svg
    ├── index.style.css             # 🆕 Login page (modern)
    ├── teleapp.style.css           # Mini App overrides
    │
    ├── 📂 css/app/                 # 🎨 Modular CSS (28 files)
    │   ├── index.css               # Entry point
    │   ├── 01-design-tokens.css    # CSS variables
    │   ├── 02-base-reset.css
    │   ├── 03-background-decor.css # HUD background
    │   ├── 04-app-shell.css
    │   ├── 05-sidebar.css          # Sidebar + brand
    │   ├── 06-header.css
    │   ├── 07-content-area.css
    │   ├── 08-buttons.css          # 🆕 13+ varian buttons
    │   ├── 09-forms-base.css
    │   ├── 10-cards.css
    │   ├── 11-tables.css
    │   ├── 12-modal.css
    │   ├── 13-toast.css
    │   ├── 14-file-lightbox.css
    │   ├── 15-badges.css
    │   ├── 16-utilities.css
    │   ├── 17-dashboard.css
    │   ├── 18-detail-page.css      # 🆕 Fix light mode colors
    │   ├── 19-modern-form.css
    │   ├── 20-form-page.css
    │   ├── 21-flatpickr.css
    │   ├── 22-responsive.css
    │   ├── 23-accessibility.css
    │   ├── 24-light-mode.css       # 🆕 Detail page overrides
    │   ├── 25-print.css
    │   ├── 26-fuel-summary.css
    │   ├── 27-reports.css          # Reports page
    │   └── 28-settings.css         # Settings (grid layout)
    │
    └── 📂 js/                      # 🔧 Modular JavaScript
        ├── teleapp.script.js       # Mini App bootstrap
        │
        └── 📂 app/
            ├── 📂 utils/           # LAYER 1: Foundation
            │   ├── icons.js        # ✨ Icon registry (FA Free)
            │   ├── dom.js
            │   ├── timezone.js
            │   └── formatters.js
            │
            ├── 📂 core/            # LAYER 2: Core
            │   ├── state.js
            │   ├── api.js          # Fetch + auto-redirect 401/404
            │   └── router.js
            │
            ├── 📂 shared/          # LAYER 3: Shared
            │   ├── files.js
            │   └── renderer.js
            │
            ├── 📂 layout/          # LAYER 4: Layout
            │   ├── theme.js
            │   ├── sidebar.js
            │   └── header.js
            │
            ├── 📂 views/           # LAYER 5: Views
            │   ├── dashboard.js
            │   ├── vehicles.js
            │   ├── services.js
            │   ├── fuels.js
            │   ├── documents.js
            │   ├── reminders.js
            │   ├── reports.js      # Laporan
            │   └── settings.js     # 🆕 Profile + Password + Account
            │
            ├── 📂 form/            # LAYER 6: Forms
            │   ├── builders.js
            │   ├── hooks.js
            │   ├── definitions.js
            │   ├── modal.js
            │   └── page.js
            │
            └── main.js             # LAYER 7: Entry
```

**Total:** ~60 file, ~12.500 baris kode.

---

## 🚀 Instalasi

### Prerequisites

- **Python** 3.9 atau lebih baru
- **PocketBase** 0.22.x — [download](https://pocketbase.io/docs/)
- **Node.js** 18+ (opsional, untuk bundle)
- **Telegram Bot Token** — dari [@BotFather](https://t.me/BotFather)
- **Git**

### Langkah Instalasi

```bash
# 1. Clone
git clone https://github.com/your-username/vtrack.git
cd vtrack

# 2. Virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # Linux/macOS

# 3. Install dependencies
pip install -r requirements.txt

# 4. Setup PocketBase (lihat section Konfigurasi)
```

**Isi `requirements.txt`:**

```txt
Flask>=3.0.0
requests>=2.31.0
python-dotenv>=1.0.0
python-telegram-bot[job-queue]>=20.7
Werkzeug>=3.0.0
```

---

## ⚙️ Konfigurasi

### File `.env`

```bash
# =====================================================================
# Flask Configuration
# =====================================================================
SECRET_KEY=your-random-secret-key-min-32-chars
FLASK_DEBUG=0
PORT=5000

# Session cookie (WAJIB untuk Mini App)
SESSION_COOKIE_SAMESITE=None
SESSION_COOKIE_SECURE=1

# =====================================================================
# PocketBase Configuration
# =====================================================================
PB_URL=http://localhost:8090
PB_ADMIN_EMAIL=admin@example.com
PB_ADMIN_PASSWORD=your-pocketbase-admin-password

# =====================================================================
# Telegram Bot Configuration
# =====================================================================
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ
TELEGRAM_BOT_USERNAME=YourVehicleTrackerBot
WEBAPP_URL=https://vt.yourdomain.com/tg-app

# =====================================================================
# Bot ↔ Backend Security (WAJIB untuk registrasi via bot)
# =====================================================================
BOT_API_KEY=generate-dengan-python-secrets-token-hex-32
BACKEND_URL=http://127.0.0.1:5000
ADMIN_TELEGRAM_IDS=123456789,987654321
DAILY_HOUR_WIB=8

# =====================================================================
# Logging
# =====================================================================
LOG_LEVEL=INFO
LOG_DIR=logs
```

### Generate Secret Keys

```bash
# Generate SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"

# Generate BOT_API_KEY
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## ▶️ Menjalankan Aplikasi

Buka **3 terminal**:

```bash
# Terminal 1: PocketBase
cd pocketbase
./pocketbase serve --http=0.0.0.0:8090

# Terminal 2: Flask Backend
source venv/bin/activate     # atau venv\Scripts\activate
python app.py

# Terminal 3: Telegram Bot
python bot.py
```

**Expected output Flask:**

```
🚀 Vehicle Tracker — http://0.0.0.0:5000
   PB_URL: http://localhost:8090
   SESSION_COOKIE_SAMESITE: None
   SESSION_COOKIE_SECURE:   True
   BOT_API_KEY: ✓ set
   PASSWORD_MIN_LENGTH: 8
```

**Expected output Bot:**

```
✅ Admin PB login OK
🚀 Starting bot @YourBot
🔗 Backend URL: http://127.0.0.1:5000
🔐 BOT_API_KEY: ✓ set
✅ Commands list di-set
✅ Menu button Mini App di-set
⏰ Daily job dijadwalkan jam 08:00 WIB
🤖 Bot polling...
```

---

## 🤖 Registrasi via Bot Telegram

User bisa daftar **langsung dari chat Telegram**, tanpa buka web.

### Alur Registrasi

```
1. User buka bot → /start
   ↓
2. Bot tawarkan: [📝 Daftar Akun Baru] [🔗 Link Akun Lama]
   ↓
3. User klik "Daftar Akun Baru"
   ↓
4. Bot tanya Nama → User ketik nama
   ↓
5. Bot tanya Email (opsional, bisa /skip) → User ketik email
   ↓
6. Bot tampilkan konfirmasi → User klik "Ya, Daftar"
   ↓
7. Bot kirim ke backend (HMAC signed)
   ↓
8. Backend verify + rate limit + validate + create user
   ↓
9. Backend generate password 16 char
   ↓
10. Bot kirim password ke user (auto-delete 60s)
    ↓
11. User klik [🚗 Buka Vehicle Tracker] → auto-login
```

### Contoh Interaksi

```
User: /start

Bot: 🚗 Selamat datang di Vehicle Tracker Bot!
     ...
     Pilih cara akses:
     [📝 Daftar Akun Baru]
     [🔗 Link Akun Lama]

User: [Klik Daftar Akun Baru]

Bot: 📝 Registrasi Akun Baru
     Siapa nama lengkap Anda?
     (2-50 karakter, huruf & spasi)
     Ketik /cancel untuk batal.

User: Budi Santoso

Bot: ✅ Nama: Budi Santoso
     Sekarang, masukkan email Anda:
     ...
     Ketik /skip untuk lewati

User: budi@example.com

Bot: 📋 Konfirmasi Data:
     👤 Nama: Budi Santoso
     📧 Email: budi@example.com
     💬 Telegram: @budisantoso
     Lanjut daftar?
     [✅ Ya, Daftar]  [❌ Batal]

User: [Klik Ya, Daftar]

Bot: ⏳ Membuat akun...
     ✅ Akun berhasil dibuat!
     🔐 Password sementara:
     `Kx9#mPq2Lw7@NvYz`
     ⚠️ Pesan ini akan dihapus dalam 60 detik
     [🚗 Buka Vehicle Tracker]
```

### Keamanan Registrasi (5 Layer)

| Layer | Implementasi |
|-------|--------------|
| **1. Bot-side** | Rate limit (3/jam per tg_id), conversation timeout (5 min), input validation |
| **2. Transport** | HMAC signature, timestamp window (30s), nonce (anti-replay) |
| **3. Backend** | Verify HMAC, rate limit (tg_id + IP), duplicate check, validation ulang |
| **4. Data** | Auto-generate password (16 char), auto-delete message (60s), HttpOnly cookie |
| **5. Audit** | Log semua registrasi di `registration_log`, admin alerts |

---

## 📱 Telegram Integration

### Bot Commands

| Command | Deskripsi | Access |
|---------|-----------|--------|
| `/start` | Sapaan + menu (daftar/link) | All |
| `/status` | Status semua kendaraan | Linked |
| `/reminders` | Daftar pengingat aktif | Linked |
| `/myaccount` | Info akun Anda | Linked |
| `/link <token>` | Link akun Telegram | All |
| `/unlink` | Putuskan tautan | All |
| `/help` | Bantuan lengkap | All |
| `/ping` | Cek latency bot | All |
| `/stats` | Statistik bot | **Admin** |
| `/broadcast <msg>` | Broadcast ke semua user | **Admin** |

### Daily Reminder

Bot kirim notifikasi otomatis setiap hari **08:00 WIB** untuk:
- Reminder due (`sisa_km <= 500` atau `days <= 7`)
- Dokumen kadaluarsa

**Format:**
```
🔔 Pengingat Hari Ini — Budi Santoso

• Ganti Oli (Scoopy)
  🟡 SEGERA: 250 km

• Bayar Pajak (Avanza)
  🔴 LEWAT: 3 hari

Kirim /reminders untuk detail lengkap.
```

---

## 🗄️ Struktur Database

### Collection: `users` (Extended)

| Field | Type | Deskripsi |
|-------|------|-----------|
| **Basic** | | |
| `email` | email | Required, unique |
| `name` | text | Nama lengkap |
| `no_hp` | text | No HP (opsional) |
| `avatar` | file | Nullable |
| **Telegram** | | |
| `telegram_id` | text | Telegram user ID |
| `telegram_username` | text | Username |
| `telegram_linked_at` | date | Kapan di-link |
| `telegram_link_token` | text | One-time token |
| **Registration** | | |
| `registered_via` | select | `web`, `telegram`, `admin` |
| `registered_at` | date | Timestamp registrasi |
| `registered_from_ip` | text | IP address |
| **Verification** | | |
| `is_verified` | bool | Verified via Telegram |
| `password_set` | bool | User sudah set password? |
| `password_temporary` | bool | Password auto-generated? |
| **Stats** | | |
| `last_login_at` | date | Terakhir login |
| `login_count` | number | Total login |

### Collection: `vehicles`

| Field | Type | Deskripsi |
|-------|------|-----------|
| `owner` | relation → users | Required |
| `nama` | text | Nama panggilan |
| `jenis` | select | `motor`, `mobil`, `lainnya` |
| `merek`, `model`, `tahun` | mixed | Info kendaraan |
| `plat_nomor`, `warna` | text | Identifikasi |
| `nomor_rangka`, `nomor_mesin` | text | Serial number |
| `odometer_terakhir` | number | Auto-update |
| `tanggal_beli` | date | Nullable |
| `foto` | file | Max 5MB |
| `catatan` | text | Nullable |

### Collections: `service_records`, `fuel_logs`, `documents`, `reminders`

Semua collection punya field `owner` (relation ke users) dengan **API Rules**:

```
List/View:  @request.auth.id != "" && owner = @request.auth.id
Create:     @request.auth.id != "" && @request.data.owner = @request.auth.id
Update:     @request.auth.id != "" && owner = @request.auth.id
Delete:     @request.auth.id != "" && owner = @request.auth.id
```

### Collection: `registration_log` (Audit)

| Field | Type | Deskripsi |
|-------|------|-----------|
| `telegram_id` | text | Telegram user ID |
| `telegram_username` | text | Username |
| `action` | select | `register`, `link`, `fail_rate_limit` |
| `ip_address` | text | IP address |
| `user_agent` | text | User agent |
| `success` | bool | Berhasil atau tidak |
| `error_message` | text | Kalau gagal, kenapa |
| `metadata` | json | Extra info |

---

## 📚 API Reference

### Auth Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/auth/login` | Login email + password |
| `POST` | `/api/auth/register` | Register via web |
| `POST` | `/api/auth/register-via-telegram` | Registrasi via bot (HMAC) |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/auth/me` | Get current user |
| `PATCH` | `/api/auth/update-profile` | Update nama, email, no_hp |
| `POST` | `/api/auth/change-password` | Ganti password |
| `POST` | `/api/auth/delete-account` | Hapus akun + cascade |
| `POST` | `/api/auth/telegram` | Auto-login via initData |

### Vehicle Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/vehicles` | List kendaraan |
| `POST` | `/api/vehicles` | Create |
| `PATCH` | `/api/vehicles/<id>` | Update |
| `DELETE` | `/api/vehicles/<id>` | Delete (cascade) |

### Record Endpoints (Generic)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/records/<collection>` | List records |
| `POST` | `/api/records/<collection>` | Create |
| `PATCH` | `/api/records/<collection>/<id>` | Update |
| `DELETE` | `/api/records/<collection>/<id>` | Delete |

**Collection valid:** `service_records`, `fuel_logs`, `documents`, `reminders`.

### Business Logic

- **Auto-update odometer** — Setiap `service_records` atau `fuel_logs` baru dengan odometer lebih tinggi → auto-update `vehicles.odometer_terakhir`
- **Auto-calc fuel consumption** — Setiap `fuel_logs` baru dengan `full_tank=true` → hitung konsumsi dari full-tank sebelumnya
- **Numeric validation** — Field number divalidasi sesuai `NUMERIC_RULES`

---

## 🎨 Design System

### Icon Registry

Semua icon **via registry** di `static/js/app/utils/icons.js` — **single source of truth**:

```javascript
// ✅ PAKAI REGISTRY
`<i class="${VT.icon('car')}"></i>`

// ❌ JANGAN HARDCODE
`<i class="fa-solid fa-car-side"></i>`
```

**Keuntungan:**
- Ganti icon library tinggal ubah 1 file
- Tidak ada typo class
- Dokumentasi jelas icon apa saja yang dipakai
- Semua icon **Font Awesome Free** (bukan Pro)

### Design Tokens

Semua warna via **CSS Custom Properties**:

```css
:root {
  --c-primary: #3b82f6;
  --c-text: #f1f5f9;
  --c-surface: rgba(30, 41, 59, 0.55);
  --r-md: 10px;
  --t-fast: 120ms cubic-bezier(0.4, 0, 0.2, 1);
}

[data-bs-theme="light"] {
  --c-primary: #2563eb;
  --c-text: #0f172a;
  --c-surface: rgba(255, 255, 255, 0.85);
}
```

### Button System (v1.1.1)

**13+ varian lengkap:**

| Kategori | Varian |
|----------|--------|
| **Solid** | `.btn-primary`, `.btn-secondary`, `.btn-success`, `.btn-danger`, `.btn-warning`, `.btn-light`, `.btn-dark` |
| **Outline** | `.btn-outline-primary`, `.btn-outline-secondary`, `.btn-outline-danger`, `.btn-outline-light` |
| **Special** | `.btn-icon-sm` (34×34), `.btn-icon-round` (40×40), `.btn-icon` (42×42) |

**States:** `:hover`, `:active`, `:disabled`, `:focus-visible`, `.loading`

### Animation Style

| Animasi | Trigger | Efek |
|---------|---------|------|
| `cardEnter` | Mount | Slide up + scale bounce |
| `heroEnter` | Mount | Fade + slide (staggered) |
| `formEnter` | Mount | Sequential fade in |
| `iconFloat` | Loop | Float up-down 4s |
| `heroShimmer` | Loop | Shimmer sweep 4s |
| `glowPulse` | Loop | Glow pulse 3s |
| `brandPulse` | Loop | Dot pulse 2s |

**Staggered entrance** — elemen muncul satu per satu (100ms delay each).

### Responsive Breakpoints

| Breakpoint | Target | Layout |
|------------|--------|--------|
| `< 576px` | Mobile portrait | Stack vertical, touch-friendly |
| `576-991px` | Tablet | 2 columns where appropriate |
| `≥ 992px` | Desktop | Full grid layout |

### Theme Switching

```javascript
// Toggle theme
VT.toggleTheme();

// Auto-follow system
if (!VT.getStoredTheme()) {
  VT.applyTheme(window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
}
```

---

## 🔒 Keamanan

### Lapisan Keamanan

1. **Transport** — HTTPS, HttpOnly cookie, SameSite=None; Secure
2. **Authentication** — PocketBase bcrypt, initData HMAC-SHA256, session 7 hari
3. **Authorization** — Ownership check di setiap API, admin-only commands
4. **Input Validation** — Sanitize HTML/Markdown, numeric validation, email validation
5. **Bot Security** — HMAC signature, timestamp window, nonce cache, rate limiting
6. **Registration** — 5-layer security (bot → transport → backend → data → audit)
7. **Data Protection** — Auto-generate password, auto-delete message, cascade delete

### Password Policy

**Minimal 8 karakter** (standar PocketBase):

- ✅ Tidak wajib simbol
- ✅ Tidak wajib huruf besar/kecil
- ✅ Tidak wajib angka
- ❌ Tidak boleh sama dengan password lama

### Environment Variables (Security Critical)

| Variable | Fungsi | Wajib? |
|----------|--------|--------|
| `SECRET_KEY` | Flask session encryption | ✅ |
| `BOT_API_KEY` | HMAC bot → backend | ✅ |
| `PB_ADMIN_PASSWORD` | Admin PocketBase | ✅ |
| `TELEGRAM_BOT_TOKEN` | Bot auth | ✅ |
| `SESSION_COOKIE_SAMESITE` | CSRF | ✅ (None untuk Mini App) |
| `SESSION_COOKIE_SECURE` | HTTPS-only cookie | ✅ (1 untuk production) |

**JANGAN commit `.env` ke Git!**

---

## 🛠️ Development

### Workflow

```bash
# Aktifkan venv
source venv/bin/activate     # Linux/macOS
venv\Scripts\activate        # Windows

# Jalankan 3 terminal (lihat Menjalankan Aplikasi)
```

### Struktur Modul Frontend

Setiap layer punya **single responsibility**:

```
utils/    → Foundation (tidak depend apa-apa)
core/     → Butuh utils
shared/   → Butuh core
layout/   → Butuh core + shared
views/    → Butuh semua di atas
form/     → Butuh views + utils
main.js   → Entry point
```

**Aturan dependensi:**
- ✅ Layer atas boleh pakai layer bawah
- ❌ Layer bawah TIDAK BOLEH depend ke layer atas

### Logging

Semua log ke console + file:

```bash
# Live tail log
tail -f logs/app.log
tail -f logs/bot.log
```

**Format:**
```
2026-09-24 16:52:17 [INFO] vt-web: [change-password] ✅ Password updated for user xxx
2026-09-24 16:52:17 [ERROR] vt-web: [change-password] PB error: ...
```

**Rotasi:** max 5MB per file, 5 backup (30MB total).

### Icon Usage

```javascript
// Dapatkan class icon
VT.icon('car')             // 'fa-solid fa-car-side'
VT.icon('car', 'fa-2x')    // 'fa-solid fa-car-side fa-2x'

// Render HTML
VT.iconHtml('car')         // '<i class="fa-solid fa-car-side"></i>'
VT.iconHtml('car', 'me-1') // '<i class="fa-solid fa-car-side me-1"></i>'
```

**Cek icon Free di [fontawesome.com](https://fontawesome.com/icons)** — filter "Free" sebelum tambah ke registry.

---

## 🌐 Deployment

### VPS Setup (Ubuntu 22.04)

```bash
# 1. Install dependencies
sudo apt update
sudo apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx unzip curl

# 2. Setup project
sudo mkdir -p /opt/vtrack
sudo chown $USER:$USER /opt/vtrack
cd /opt/vtrack
git clone https://github.com/your-username/vtrack.git .
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Download PocketBase
mkdir pocketbase && cd pocketbase
wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.x/pocketbase_0.22.x_linux_amd64.zip
unzip pocketbase_0.22.x_linux_amd64.zip
chmod +x pocketbase
```

### Systemd Services

**`/etc/systemd/system/pocketbase.service`:**
```ini
[Unit]
Description=PocketBase
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/vtrack/pocketbase
ExecStart=/opt/vtrack/pocketbase/pocketbase serve --http=127.0.0.1:8090
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**`/etc/systemd/system/vtrack-web.service`:**
```ini
[Unit]
Description=Vehicle Tracker Web
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/vtrack
Environment="PATH=/opt/vtrack/venv/bin"
ExecStart=/opt/vtrack/venv/bin/python app.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**`/etc/systemd/system/vtrack-bot.service`:**
```ini
[Unit]
Description=Vehicle Tracker Bot
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/vtrack
Environment="PATH=/opt/vtrack/venv/bin"
ExecStart=/opt/vtrack/venv/bin/python bot.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable & start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable pocketbase vtrack-web vtrack-bot
sudo systemctl start pocketbase vtrack-web vtrack-bot
```

### Nginx + SSL

```bash
sudo certbot --nginx -d vt.yourdomain.com
```

**`/etc/nginx/sites-available/vtrack`:**
```nginx
server {
    listen 443 ssl http2;
    server_name vt.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/vt.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vt.yourdomain.com/privkey.pem;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location /static/ {
        proxy_pass http://127.0.0.1:5000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 🐛 Troubleshooting

### Mini App: "Cookie session tidak tersimpan"

**Penyebab:** Konfigurasi cookie salah.

**Solusi:**
```bash
SESSION_COOKIE_SAMESITE=None
SESSION_COOKIE_SECURE=1
```

Pastikan Mini App di-serve via **HTTPS**.

### Bot: "Unauthorized" saat registrasi

**Penyebab:** HMAC signature mismatch — `BOT_API_KEY` beda antara bot & backend.

**Solusi:**
1. Regenerate `BOT_API_KEY`:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
2. Update `.env` — pastikan **sama persis** di bot & backend
3. Restart **kedua** service

### Change Password: "oldPassword: Cannot be blank"

**Penyebab:** PocketBase require field `oldPassword` saat update password.

**Solusi:** Sudah diperbaiki di v1.1.1 — backend kirim `oldPassword`.

### Change Password: Session invalid setelah sukses

**Penyebab:** PocketBase invalidate token lama setelah password berubah.

**Solusi:** Sudah diperbaiki di v1.1.1 — auto-logout + redirect ke login.

### Icon tidak muncul

**Penyebab:** Font Awesome Free tidak punya icon tersebut (mungkin Pro-only).

**Debug:**
1. Cek di [fontawesome.com/icons](https://fontawesome.com/icons) — filter "Free"
2. Kalau Pro-only, ganti dengan alternatif Free:
   - `fa-signpost` → `fa-route`
   - `fa-magnifying-glass-plus` → `fa-magnifying-glass`
   - `fa-message-dots` → `fa-comment-dots`

### Detail page warna aneh di light mode

**Penyebab:** Hardcoded dark colors tidak theme-aware.

**Solusi:** Sudah diperbaiki di v1.1.1 — semua elemen pakai CSS variables.

### Sidebar ikut scroll

**Penyebab:** `position: sticky` tidak bekerja.

**Solusi:** Body di-lock `overflow: hidden`, `.app-content` yang scroll.

---

## 📝 Changelog

### v1.1.1 (2026-09-24) — UI Polish & Bug Fixes

**🎨 UI Improvements:**
- Login page redesign (hero icon + animasi)
- Settings grid 2 kolom (desktop)
- Profile hero dengan avatar inisial
- Button system overhaul (13+ varian)
- Light mode fix untuk detail page
- Responsive polish di semua halaman

**🐛 Bug Fixes:**
- Icon "Biaya per KM" tidak muncul (`fa-signpost` Pro-only)
- Detail page warna aneh di light mode
- Tombol di detail page kurang kontras di light mode
- Settings layout terlihat kosong di desktop
- Divider "ATAU" terlalu besar

**🔧 Technical:**
- Password min length: 8 karakter (standar PocketBase)
- Change password: tambah `oldPassword` field
- Auto-logout + redirect setelah change password
- Audit icon registry — semua FA Free
- CSS variables lebih konsisten

### v1.1.0 (2026-09-20) — Registration & Account Management

**✨ New:**
- Registrasi via Bot Telegram
- HMAC-signed request
- Edit profil (nama, email, no_hp)
- Ganti password + validasi
- Hapus akun self-service
- Halaman Laporan
- Bot commands: `/myaccount`, `/stats`, `/broadcast`
- Auto-track login stats
- Audit trail collection

**🔧 Fixes:**
- HMAC mismatch (Solusi A)
- PocketBase `oldPassword` requirement
- Session invalid redirect
- Sidebar overflow
- Theme awareness sidebar mobile

### v1.0.0 (2026-09-15) — Initial Release

**✨ Features:**
- Manajemen kendaraan
- Catatan servis
- Tracking BBM dengan auto-calc
- Manajemen dokumen
- Pengingat (KM / tanggal)
- Telegram bot + daily reminder
- Telegram Mini App
- Dark & light theme

---

## 🗺️ Roadmap

### v1.2 (Next)
- [ ] Fitur Catatan Kerusakan (Damage Log)
- [ ] Pengingat Pajak otomatis
- [ ] Bengkel favorit / vendor

### v1.3
- [ ] Multi-kendaraan compare
- [ ] Prediksi pengeluaran
- [ ] Export PDF laporan

### v1.4
- [ ] Integrasi kalender (iCal)
- [ ] AI Chatbot assistant
- [ ] Public share link

### v2.0 (Long-term)
- [ ] Mobile app (React Native / Flutter)
- [ ] Offline mode (PWA)
- [ ] Multi-user collaboration
- [ ] Analytics dashboard

---

## 📄 Lisensi

MIT License

Copyright (c) 2026 Vehicle Tracker

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## 🙏 Kredit

**Built with:**
- [Flask](https://flask.palletsprojects.com/) — Web framework
- [PocketBase](https://pocketbase.io/) — Backend as a Service
- [python-telegram-bot](https://python-telegram-bot.org/) — Telegram Bot API
- [Bootstrap 5](https://getbootstrap.com/) — UI Framework
- [Font Awesome](https://fontawesome.com/) — Icons
- [Flatpickr](https://flatpickr.js.org/) — Date picker
- [Inter Font](https://rsms.me/inter/) — Typography

**Inspired by:**
- Automotive HUD interfaces
- Liquid Glass design trend
- Modern SaaS dashboards

---

## 📞 Kontak

- **Issues**: [GitHub Issues](https://github.com/your-username/vtrack/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/vtrack/discussions)
- **Email**: your-email@example.com
- **Telegram**: [@YourUsername](https://t.me/YourUsername)

---

<div align="center">

**Made with ❤️ for vehicle owners everywhere**

[⬆ Kembali ke atas](#-vehicle-tracker)

</div>

