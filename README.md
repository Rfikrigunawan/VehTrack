
# 🚗 Vehicle Tracker

> **Smart tracking system** untuk mengelola kendaraan pribadi: servis, BBM, dokumen, pengingat, dan laporan — dalam satu aplikasi terintegrasi.

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/)
[![Python](https://img.shields.io/badge/python-3.9%2B-blue)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/flask-3.x-green)](https://flask.palletsprojects.com/)
[![PocketBase](https://img.shields.io/badge/pocketbase-0.22.x-orange)](https://pocketbase.io/)
[![Telegram](https://img.shields.io/badge/telegram-bot%20%2B%20mini%20app-blue)](https://telegram.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## 📋 Daftar Isi

1. [Apa yang Baru di v1.1](#-apa-yang-baru-di-v11)
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
12. [Keamanan](#-keamanan)
13. [Development](#-development)
14. [Deployment](#-deployment)
15. [Troubleshooting](#-troubleshooting)
16. [Changelog](#-changelog)
17. [Roadmap](#-roadmap)
18. [Lisensi](#-lisensi)

---

## 🆕 Apa yang Baru di v1.1

### ✨ Fitur Baru

| Fitur | Deskripsi |
|-------|-----------|
| 🤖 **Registrasi via Bot Telegram** | User bisa daftar akun langsung dari chat bot, tanpa buka web |
| 👤 **Edit Profil** | User bisa edit nama, email, dan nomor HP sendiri |
| 🔐 **Ganti Password** | User bisa ganti password dari Mini App dengan validasi kuat |
| 🗑️ **Hapus Akun** | User bisa hapus akun + semua data (self-service) |
| 📊 **Halaman Laporan** | Analisis pengeluaran, konsumsi BBM, top servis, trend bulanan/tahunan |
| 📈 **Auto-Tracking Login** | Sistem mencatat `login_count` & `last_login_at` otomatis |
| 🛡️ **HMAC Security** | Registrasi via bot dilindungi HMAC signature + anti-replay |
| 📝 **Audit Trail** | Semua registrasi dicatat di collection `registration_log` |
| 🎨 **UI Settings Baru** | Halaman Settings dengan struktur kartu yang clean |
| 🌓 **Enhanced Light Mode** | Light mode lebih lengkap & konsisten |

### 🔧 Perbaikan

- ✅ **Fix HMAC mismatch** — Signature verification sekarang konsisten
- ✅ **Fix sidebar overflow** — Sidebar mobile tidak overflow lagi
- ✅ **Fix theme awareness** — Sidebar mobile ikut dark/light mode
- ✅ **Fix password policy** — Sekarang min 8 karakter (standar PocketBase)
- ✅ **Fix session invalid** — Auto-redirect ke login kalau session expired
- ✅ **Robust logging** — Rotating file logger untuk app & bot
- ✅ **Font Awesome** — Migrasi dari Bootstrap Icons ke Font Awesome
- ✅ **Modular CSS & JS** — Split file untuk maintainability

### 🆕 Bot Commands Baru

| Command | Fungsi |
|---------|--------|
| `/myaccount` | Info akun user |
| `/stats` | Statistik bot (admin only) |
| `/broadcast` | Broadcast pesan ke semua user (admin only) |
| `/reset-password` | Reset password via bot (opsional) |

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

- **Bot Telegram** — Commands lengkap untuk cek status & reminder
- **Mini App** — Dashboard embedded di Telegram (auto-login)
- **Registrasi via Bot** — Daftar langsung dari chat, tanpa buka web
- **Daily Reminder** — Notifikasi otomatis jam 08:00 WIB
- **Admin Commands** — `/stats`, `/broadcast` untuk monitoring

### 🎨 UI/UX

- **Dark & Light Mode** — Auto-follow system atau toggle manual
- **Liquid Glass Effect** — UI modern dengan backdrop blur
- **HUD Background** — Dekorasi automotive (grid, road, speedometer)
- **Responsive** — Optimal di desktop, tablet, HP
- **Haptic Feedback** — Getaran di Mini App Telegram
- **Font Awesome 6** — Icon modern & konsisten

### 🌐 Multi-Access

1. **Web Browser** — Dashboard lengkap di `https://your-domain.com/app`
2. **Telegram Bot** — Chat commands untuk cek status cepat
3. **Telegram Mini App** — Dashboard embedded, auto-login via initData

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
             │                    │                │
             ▼                    ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                    FLASK BACKEND (app.py)                    │
│                                                              │
│  • Auth (login, register, logout, me)                       │
│  • Registrasi via bot (HMAC-signed)                         │
│  • Update profile (nama, email, no_hp)                      │
│  • Change password (validasi + oldPassword)                 │
│  • Delete account (cascade)                                 │
│  • Telegram initData verification                           │
│  • CRUD proxy ke PocketBase                                 │
│  • Business logic (odometer, fuel consumption)              │
│  • File streaming proxy                                     │
│  • SPA routing                                              │
└────────────────────────────┬────────────────────────────────┘
                             │
                             │ HTTP (REST)
                             │
┌────────────────────────────▼────────────────────────────────┐
│                    POCKETBASE (Database)                     │
│                                                              │
│  • Auth collection: users (extended fields)                 │
│  • Data: vehicles, service_records, fuel_logs,              │
│    documents, reminders                                     │
│  • Audit: registration_log                                  │
│  • File storage                                             │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    TELEGRAM BOT (bot.py)                     │
│                                                              │
│  • Commands: /start, /status, /reminders, /myaccount,       │
│    /link, /unlink, /help, /ping                             │
│  • Admin: /stats, /broadcast                                │
│  • Registrasi via bot (ConversationHandler)                 │
│  • Daily reminder @ 08:00 WIB                               │
│  • Menu button setup (Mini App launcher)                    │
│  • Auto-delete password message (60 detik)                  │
└──────────────────────────────────────────────────────────────┘
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
| | Font Awesome 6.5 | Icons |
| | Flatpickr 4.6 | Date picker |
| | CSS Custom Properties | Theming |

### Design Principles

- **Modular Architecture** — Separate layers (utils, core, layout, views, form)
- **Single Source of Truth** — Icon registry, state management
- **Defense in Depth** — 5 layer security untuk registrasi via bot
- **Progressive Enhancement** — Fallback ke native input
- **Mobile-First** — Responsive breakpoints
- **Accessibility** — ARIA labels, keyboard navigation, reduced-motion

---

## 📁 Struktur Project

```
vtrack/
│
├── 📄 app.py                       # Flask backend (routes, auth, API, business logic)
├── 📄 bot.py                       # Telegram bot (commands, registrasi, daily reminder)
├── 📄 pocketbase_client.py         # HTTP wrapper ke PocketBase
├── 📄 requirements.txt             # Python dependencies
├── 📄 .env                         # Environment variables (TIDAK di-commit)
├── 📄 .env.example                 # Template .env
├── 📄 .gitignore                   # Git ignore rules
├── 📄 README.md                    # Dokumentasi ini
├── 📄 LICENSE                      # MIT License
│
├── 📂 logs/                        # Auto-created — log files (rotating)
│   ├── app.log                     # Log Flask
│   ├── app.log.1, .2, ...          # Backup (max 5)
│   ├── bot.log                     # Log bot
│   └── bot.log.1, .2, ...
│
├── 📂 templates/                   # Jinja2 templates
│   ├── index.html                  # Login page (dengan tombol daftar via bot)
│   ├── app.html                    # Web dashboard
│   └── teleapp.html                # Telegram Mini App
│
└── 📂 static/                      # Static assets
    │
    ├── icon.svg                    # Favicon
    │
    ├── index.style.css             # Login page style
    ├── teleapp.style.css           # Mini App specific overrides
    │
    ├── 📂 css/app/                 # 🎨 Modular CSS (28 files)
    │   ├── index.css               # Entry point
    │   ├── 01-design-tokens.css    # CSS variables
    │   ├── 02-base-reset.css       # Reset
    │   ├── 03-background-decor.css # HUD background
    │   ├── 04-app-shell.css        # Layout wrapper
    │   ├── 05-sidebar.css          # Sidebar + brand + user
    │   ├── 06-header.css           # Header + filter
    │   ├── 07-content-area.css     # Content padding
    │   ├── 08-buttons.css          # Button variants
    │   ├── 09-forms-base.css       # Bootstrap form
    │   ├── 10-cards.css            # Card
    │   ├── 11-tables.css           # Table
    │   ├── 12-modal.css            # Modal
    │   ├── 13-toast.css            # Toast
    │   ├── 14-file-lightbox.css    # File thumb + lightbox
    │   ├── 15-badges.css           # Badge variants
    │   ├── 16-utilities.css        # Utilities
    │   ├── 17-dashboard.css        # Dashboard
    │   ├── 18-detail-page.css      # Detail page
    │   ├── 19-modern-form.css      # Modern form
    │   ├── 20-form-page.css        # Form page
    │   ├── 21-flatpickr.css        # Flatpickr override
    │   ├── 22-responsive.css       # Responsive
    │   ├── 23-accessibility.css    # A11y + safe area
    │   ├── 24-light-mode.css       # Light mode
    │   ├── 25-print.css            # Print
    │   ├── 26-fuel-summary.css     # Fuel summary cards
    │   ├── 27-reports.css          # Reports page
    │   └── 28-settings.css         # Settings page
    │
    └── 📂 js/                      # 🔧 Modular JavaScript
        │
        ├── teleapp.script.js       # Mini App bootstrap
        │
        └── 📂 app/                 # App modules
            ├── 📂 utils/           # LAYER 1: Foundation
            │   ├── icons.js        # ✨ Icon registry (single source of truth)
            │   ├── dom.js          # $, $$, escapeHtml, escapeStr
            │   ├── timezone.js     # WIB helpers
            │   └── formatters.js   # fmtRp, fmtNum, jenisIcon
            │
            ├── 📂 core/            # LAYER 2: Core
            │   ├── state.js        # Global state
            │   ├── api.js          # Fetch wrapper + auto-redirect 401/404
            │   └── router.js       # URL routing (SPA)
            │
            ├── 📂 shared/          # LAYER 3: Shared
            │   ├── files.js        # File helpers + lightbox
            │   └── renderer.js     # View dispatcher
            │
            ├── 📂 layout/          # LAYER 4: Layout
            │   ├── theme.js        # Dark/Light toggle
            │   ├── sidebar.js      # Sidebar navigation
            │   └── header.js       # Header interactions
            │
            ├── 📂 views/           # LAYER 5: Views
            │   ├── dashboard.js    # Dashboard + Detail
            │   ├── vehicles.js     # List kendaraan
            │   ├── services.js     # List servis
            │   ├── fuels.js        # List BBM + summary
            │   ├── documents.js    # List dokumen
            │   ├── reminders.js    # List pengingat
            │   ├── reports.js      # 🆕 Laporan & analisa
            │   └── settings.js     # 🆕 Profile + Password + Account
            │
            ├── 📂 form/            # LAYER 6: Forms
            │   ├── builders.js     # field, select, fileField
            │   ├── hooks.js        # Auto-calc, datepicker
            │   ├── definitions.js  # FORMS.vehicle, .service, dll
            │   ├── modal.js        # Modal mode
            │   └── page.js         # Full-page mode
            │
            └── main.js             # LAYER 7: Entry point
```

**Total:** ~60 file, ~12.000 baris kode.

---

## 🚀 Instalasi

### Prerequisites

- **Python** 3.9 atau lebih baru
- **PocketBase** 0.22.x — [download](https://pocketbase.io/docs/)
- **Node.js** 18+ (opsional, untuk bundle CSS/JS)
- **Telegram Bot Token** — dari [@BotFather](https://t.me/BotFather)
- **Git**

### Langkah Instalasi

#### 1. Clone Repository

```bash
git clone https://github.com/your-username/vtrack.git
cd vtrack
```

#### 2. Buat Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/macOS
python3 -m venv venv
source venv/bin/activate
```

#### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

**Isi `requirements.txt`:**

```txt
Flask>=3.0.0
requests>=2.31.0
python-dotenv>=1.0.0
python-telegram-bot[job-queue]>=20.7
Werkzeug>=3.0.0
```

#### 4. Setup PocketBase

**Download PocketBase:**

```bash
# Windows
wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.x/pocketbase_0.22.x_windows_amd64.zip
unzip pocketbase_0.22.x_windows_amd64.zip -d pocketbase/

# Linux
wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.x/pocketbase_0.22.x_linux_amd64.zip
unzip pocketbase_0.22.x_linux_amd64.zip -d pocketbase/

# macOS
wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.x/pocketbase_0.22.x_darwin_amd64.zip
unzip pocketbase_0.22.x_darwin_amd64.zip -d pocketbase/
```

**Jalankan PocketBase:**

```bash
cd pocketbase
./pocketbase serve --http=0.0.0.0:8090
```

**Setup Admin Account:**

1. Buka `http://localhost:8090/_/`
2. Buat superuser account (email + password)
3. Catat credentials

**Buat Collections** (lihat [Struktur Database](#-struktur-database)).

---

## ⚙️ Konfigurasi

### File `.env`

Copy dari `.env.example` lalu edit:

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
# Bot ↔ Backend Security (untuk registrasi via Telegram)
# =====================================================================
# Shared secret untuk HMAC signature (32+ hex chars)
BOT_API_KEY=generate-dengan-python-secrets-token-hex-32

# URL backend Flask (untuk bot akses API internal)
BACKEND_URL=http://127.0.0.1:5000

# Admin Telegram IDs (comma-separated) — untuk /stats & /broadcast
ADMIN_TELEGRAM_IDS=123456789,987654321

# Jam daily reminder (WIB, default 8)
DAILY_HOUR_WIB=8

# =====================================================================
# Logging
# =====================================================================
LOG_LEVEL=INFO
LOG_DIR=logs
```

### Generate Secret Keys

```bash
# Generate SECRET_KEY (32 bytes hex)
python -c "import secrets; print(secrets.token_hex(32))"

# Generate BOT_API_KEY (32 bytes hex)
python -c "import secrets; print(secrets.token_hex(32))"
```

### Setup Telegram Bot

**1. Buat bot via [@BotFather](https://t.me/BotFather):**

```
/newbot
```

Ikuti instruksi → dapat **bot token**.

**2. Set commands:**

```
/setcommands
start - Mulai & menu utama
status - Status kendaraan
reminders - Daftar pengingat aktif
myaccount - Info akun Anda
link - Link akun (dengan token)
unlink - Putuskan tautan Telegram
help - Bantuan
ping - Cek latency bot
```

**3. Setup Mini App:**

```
/newapp
```

Pilih bot → isi URL: `https://vt.yourdomain.com/tg-app`

**4. Set menu button:**

```
/setmenubutton
```

---

## ▶️ Menjalankan Aplikasi

### Development Mode

Buka **3 terminal** untuk:

#### Terminal 1: PocketBase

```bash
cd pocketbase
./pocketbase serve --http=0.0.0.0:8090
```

#### Terminal 2: Flask Backend

```bash
# Windows
venv\Scripts\activate
python app.py

# Linux/macOS
source venv/bin/activate
python app.py
```

Expected output:

```
🚀 Vehicle Tracker — http://0.0.0.0:5000
   PB_URL: http://localhost:8090
   SESSION_COOKIE_SAMESITE: None
   SESSION_COOKIE_SECURE:   True
   BOT_API_KEY: ✓ set
   PASSWORD_MIN_LENGTH: 8
```

#### Terminal 3: Telegram Bot

```bash
python bot.py
```

Expected output:

```
✅ Admin PB login OK
🚀 Starting bot @YourBot
🌐 PocketBase: http://localhost:8090
📱 WebApp URL: https://...
🔗 Backend URL: http://127.0.0.1:5000
🔐 BOT_API_KEY: ✓ set
👤 Admins: {123456789}
✅ Commands list di-set (default scope)
✅ Admin commands di-set untuk 1 admin
✅ Menu button Mini App di-set
⏰ Daily job dijadwalkan jam 08:00 WIB
🤖 Bot polling...
```

### Production Mode

Untuk production, gunakan **systemd** (Linux) atau **Windows Service**.

#### Systemd Service (Linux)

Buat `/etc/systemd/system/vtrack-web.service`:

```ini
[Unit]
Description=Vehicle Tracker Web (Flask)
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

Buat `/etc/systemd/system/vtrack-bot.service`:

```ini
[Unit]
Description=Vehicle Tracker Bot (Telegram)
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
sudo systemctl enable vtrack-web vtrack-bot
sudo systemctl start vtrack-web vtrack-bot
sudo systemctl status vtrack-web
```

#### Nginx Reverse Proxy

Buat `/etc/nginx/sites-available/vtrack`:

```nginx
server {
    listen 80;
    server_name vt.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

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
        proxy_cache_valid 200 30d;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 🤖 Registrasi via Bot Telegram

### Fitur Baru v1.1

User bisa daftar **langsung dari chat Telegram**, tanpa buka web browser.

### Alur Registrasi

```
1. User buka bot → /start
   ↓
2. Bot tawarkan: [📝 Daftar Akun Baru] [🔗 Link Akun Lama]
   ↓
3. User klik "Daftar Akun Baru"
   ↓
4. Bot tanya Nama Lengkap
   ↓
5. User ketik nama
   ↓
6. Bot tanya Email (opsional, bisa /skip)
   ↓
7. User ketik email
   ↓
8. Bot tampilkan konfirmasi
   ↓
9. User klik "Ya, Daftar"
   ↓
10. Bot kirim request ke backend (HMAC signed)
    ↓
11. Backend verify + rate limit + validate
    ↓
12. Backend create user di PocketBase
    ↓
13. Backend generate secure password (16 char)
    ↓
14. Bot kirim password ke user (auto-delete 60s)
    ↓
15. User klik [🚗 Buka Vehicle Tracker] → auto-login
```

### Contoh Interaksi

```
User: /start

Bot: 🚗 Selamat datang di Vehicle Tracker Bot!

     Bot ini membantu Anda:
     • 🚗 Mengelola kendaraan
     • 🔧 Mencatat servis
     • ⛽ Tracking BBM
     • 📄 Manajemen dokumen
     • 🔔 Pengingat otomatis

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

     Email berguna untuk:
     • Reset password
     • Notifikasi penting

     Ketik /skip untuk lewati, atau /cancel untuk batal.

User: budi@example.com

Bot: 📋 Konfirmasi Data:

     👤 Nama: Budi Santoso
     📧 Email: budi@example.com
     💬 Telegram: @budisantoso

     Lanjut daftar?

     [✅ Ya, Daftar]  [❌ Batal]

User: [Klik Ya, Daftar]

Bot: ⏳ Membuat akun...

Bot: ✅ Akun berhasil dibuat!

     📋 Informasi Akun:
     👤 Nama: Budi Santoso
     📧 Email: budi@example.com
     💬 Telegram: @budisantoso

     🔐 Password sementara:
     `Kx9#mPq2Lw7@NvYz`

     ⚠️ PENTING:
     • GANTI password di Pengaturan setelah login
     • Pesan ini akan dihapus dalam 60 detik
     • Simpan password di tempat aman

     [🚗 Buka Vehicle Tracker]

[60 detik kemudian]

Bot: [Pesan password dihapus]
```

### Keamanan Registrasi

**5 Layer Security:**

1. **Bot-side**
   - Rate limit: 3 registrasi per jam per telegram_id
   - Conversation timeout: 5 menit
   - Input validation: nama 2-50 char, email RFC-compliant

2. **Transport**
   - **HMAC signature** dengan shared secret `BOT_API_KEY`
   - **Timestamp window**: 30 detik
   - **Nonce**: anti-replay attack

3. **Backend**
   - Verify HMAC signature
   - Rate limit per telegram_id + IP
   - Duplicate check (telegram_id & email)
   - Input validation ulang

4. **Data Protection**
   - Auto-generated password (16 char, no ambiguity)
   - Password message auto-delete 60s
   - HttpOnly cookie + SameSite=None; Secure
   - `emailVisibility: false` (privacy)

5. **Audit**
   - Semua registrasi dicatat di `registration_log`
   - IP address + User-Agent tracking
   - Alert admin kalau ada spike

### Edit Profil

User bisa edit profil dari **Mini App → Pengaturan**:

- ✏️ Nama Lengkap
- 📧 Email
- 📱 No. HP (opsional)

### Ganti Password

User bisa ganti password dari **Mini App → Pengaturan → Ganti Password**:

- Password lama (verifikasi)
- Password baru (min 8 karakter)
- Konfirmasi password

**Password policy (relaxed):**
- ✅ Minimal 8 karakter
- ❌ Tidak wajib simbol
- ❌ Tidak wajib huruf besar
- ❌ Tidak wajib angka

### Hapus Akun

User bisa hapus akun dari **Mini App → Pengaturan → Danger Zone**:

- Konfirmasi dengan ketik email
- Cascade delete: kendaraan, servis, BBM, dokumen, reminders
- Redirect ke login otomatis

---

## 📱 Telegram Integration

### Alur Login Mini App

```
1. User buka Mini App dari Telegram
   ↓
2. Telegram WebApp SDK load → tg.initData tersedia
   ↓
3. teleapp.script.js kirim initData ke /api/auth/telegram
   ↓
4. Flask verify initData (HMAC-SHA256 dengan bot token)
   ↓
5. Cari user by telegram_id di PocketBase
   ↓
6. Set session Flask → return user data
   ↓
7. teleapp.script.js panggil window.__vt_init()
   ↓
8. Mini App render dashboard
```

### Alur Link Akun (User Lama)

```
1. User login di web → Settings → Link Telegram
   ↓
2. Klik "Buat Token" → generate token (5 menit expiry)
   ↓
3. Token disimpan di users.telegram_link_token
   ↓
4. User copy: /link <token>
   ↓
5. Paste di chat bot → kirim ke bot
   ↓
6. Bot verify token → update users.telegram_id
   ↓
7. Akun ter-link → user bisa pakai Mini App & daily reminder
```

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

Bot otomatis kirim notifikasi setiap hari **08:00 WIB** untuk:

- Reminder yang due (`sisa_km <= 500` atau `days <= 7`)
- Dokumen yang akan kadaluarsa
- Ringkasan singkat

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

### Collection: `users`

| Field | Type | Deskripsi |
|-------|------|-----------|
| `id` | text | Auto (PocketBase) |
| `email` | email | Required, unique |
| `name` | text | Nama lengkap |
| `no_hp` | text | No HP (opsional) |
| `avatar` | file | Nullable |
| `password` | password | Auto (hidden) |
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
| `password_temporary` | bool | Password masih auto-generated? |
| **Stats** | | |
| `last_login_at` | date | Terakhir login |
| `login_count` | number | Total login |

### Collection: `vehicles`

| Field | Type | Deskripsi |
|-------|------|-----------|
| `owner` | relation → users | Required |
| `nama` | text | Nama panggilan |
| `jenis` | select | `motor`, `mobil`, `lainnya` |
| `merek` | text | Toyota, Honda, dll |
| `model` | text | Avanza, Vario, dll |
| `tahun` | number | 1900-2100 |
| `plat_nomor` | text | B 1234 XYZ |
| `warna` | text | Putih, Hitam, dll |
| `nomor_rangka` | text | VIN |
| `nomor_mesin` | text | Nomor mesin |
| `odometer_terakhir` | number | Auto-update |
| `tanggal_beli` | date | Nullable |
| `foto` | file | Max 5MB |
| `catatan` | text | Nullable |

### Collection: `service_records`

| Field | Type | Deskripsi |
|-------|------|-----------|
| `owner` | relation → users | Required |
| `vehicle` | relation → vehicles | Required |
| `tanggal` | date | Tanggal servis |
| `jenis_servis` | select | `rutin`, `perbaikan`, `ganti_part` |
| `kategori` | text | "Ganti Oli", dll |
| `deskripsi` | text | Detail pekerjaan |
| `bengkel` | text | Nama bengkel |
| `odometer` | number | KM saat servis |
| `biaya` | number | Total biaya |
| `next_service_km` | number | Nullable |
| `next_service_date` | date | Nullable |
| `foto_nota` | file | Multiple |

### Collection: `fuel_logs`

| Field | Type | Deskripsi |
|-------|------|-----------|
| `owner` | relation → users | Required |
| `vehicle` | relation → vehicles | Required |
| `tanggal` | date | Tanggal isi |
| `odometer` | number | KM saat isi |
| `jenis_bbm` | select | Pertalite, Pertamax, dll |
| `spbu` | text | Nama SPBU |
| `liter` | number | Volume (0.01-1000) |
| `harga_per_liter` | number | Rp/L |
| `total_biaya` | number | Total bayar |
| `full_tank` | bool | Untuk hitung konsumsi |
| `konsumsi` | number | km/L (auto-calc) |

**Rumus konsumsi:**

```
konsumsi = (odometer_sekarang - odometer_full_tank_sebelumnya) / liter_sekarang
```

### Collection: `documents`

| Field | Type | Deskripsi |
|-------|------|-----------|
| `owner` | relation → users | Required |
| `vehicle` | relation → vehicles | Required |
| `jenis` | select | STNK, Pajak, Asuransi, KIR |
| `nomor` | text | Nomor dokumen |
| `tanggal_terbit` | date | Nullable |
| `tanggal_kadaluarsa` | date | Nullable |
| `biaya` | number | Biaya perpanjangan |
| `foto_dokumen` | file | Multiple |
| `catatan` | text | Nullable |

### Collection: `reminders`

| Field | Type | Deskripsi |
|-------|------|-----------|
| `owner` | relation → users | Required |
| `vehicle` | relation → vehicles | Required |
| `judul` | text | Nama reminder |
| `tipe` | select | `km` atau `tanggal` |
| `target_km` | number | Nullable |
| `target_date` | date | Nullable |
| `status` | select | `pending`, `done`, `skip` |

### Collection: `registration_log`

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

### Collection Permissions

Semua child collection pakai **API Rules**:

```
List/View:  @request.auth.id != "" && owner = @request.auth.id
Create:     @request.auth.id != "" && @request.data.owner = @request.auth.id
Update:     @request.auth.id != "" && owner = @request.auth.id
Delete:     @request.auth.id != "" && owner = @request.auth.id
```

---

## 📚 API Reference

### Auth Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/auth/login` | Login dengan email + password |
| `POST` | `/api/auth/register` | Register via web |
| `POST` | `/api/auth/register-via-telegram` | **Registrasi via bot** (HMAC-signed) |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/auth/me` | Get current user info |
| `PATCH` | `/api/auth/update-profile` | **Update nama, email, no_hp** |
| `POST` | `/api/auth/change-password` | **Ganti password** |
| `POST` | `/api/auth/delete-account` | **Hapus akun + cascade** |
| `POST` | `/api/auth/telegram` | Auto-login via Telegram initData |

### Telegram Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/api/telegram/generate-token` | Generate link token |
| `POST` | `/api/telegram/unlink` | Putuskan tautan |
| `POST` | `/api/telegram/clear-token` | Clear pending token |

### Vehicle Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/vehicles` | List kendaraan |
| `GET` | `/api/vehicles/<id>` | Detail |
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

### File Proxy

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/api/files/<collection>/<id>/<filename>` | Stream file |

### Business Logic

**Auto-update odometer:**
Setiap kali ada `service_records` atau `fuel_logs` baru dengan `odometer` lebih tinggi → otomatis update `vehicles.odometer_terakhir`.

**Auto-calc fuel consumption:**
Setiap `fuel_logs` baru dengan `full_tank=true` → hitung konsumsi dari full-tank sebelumnya.

**Validasi numeric:**
Field number divalidasi sesuai `NUMERIC_RULES` (min/max, tolak NaN/Infinity).

---

## 🔒 Keamanan

### Lapisan Keamanan

1. **Transport Security**
   - HTTPS (wajib untuk Mini App)
   - `SESSION_COOKIE_SAMESITE=None; Secure`
   - HttpOnly cookie (anti XSS)

2. **Authentication**
   - Password hashing (PocketBase bcrypt)
   - Telegram initData verification (HMAC-SHA256)
   - Session expiration 7 hari

3. **Authorization**
   - Ownership check di setiap API
   - Admin-only commands (`/stats`, `/broadcast`)
   - API Rules di PocketBase

4. **Input Validation**
   - Sanitize HTML/Markdown (anti injection)
   - Numeric field validation
   - Email format validation
   - Password strength check

5. **Bot Security**
   - HMAC signature (bot → backend)
   - Timestamp window (30s)
   - Nonce cache (anti replay)
   - Rate limiting per user

6. **Registration Security**
   - Rate limit: 3 per jam per tg_id
   - Rate limit: 10 per jam per IP
   - Duplicate check
   - Audit log

7. **Data Protection**
   - Auto-generated passwords (16 char)
   - Password message auto-delete 60s
   - `emailVisibility: false`
   - Cascade delete on account removal

### Password Policy

**Minimal 8 karakter** (standar PocketBase).

- ✅ Tidak wajib simbol
- ✅ Tidak wajib huruf besar/kecil
- ✅ Tidak wajib angka
- ❌ Tidak boleh sama dengan password lama

### Environment Variables (Security Critical)

| Variable | Fungsi | Wajib? |
|----------|--------|--------|
| `SECRET_KEY` | Flask session encryption | ✅ |
| `BOT_API_KEY` | HMAC untuk bot → backend | ✅ |
| `PB_ADMIN_PASSWORD` | Admin PocketBase | ✅ |
| `TELEGRAM_BOT_TOKEN` | Bot authentication | ✅ |
| `SESSION_COOKIE_SAMESITE` | CSRF protection | ✅ (None untuk Mini App) |
| `SESSION_COOKIE_SECURE` | HTTPS-only cookie | ✅ (1 untuk production) |

**JANGAN commit `.env` ke Git!**

---

## 🛠️ Development

### Workflow

```bash
# 1. Aktifkan venv
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows

# 2. Jalankan di 3 terminal (lihat Menjalankan Aplikasi)
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
- ❌ Layer bawah TIDAK BOLEH depend ke layer atas (sirkular)

### Icon Registry Pattern

**Jangan hardcode icon class di JS!** Pakai registry:

```javascript
// ❌ JANGAN
`<i class="fa-solid fa-car-side"></i>`

// ✅ PAKAI REGISTRY
`<i class="${VT.icon('car')}"></i>`
// atau
`${VT.iconHtml('car')}`
```

**Kenapa?** Ganti icon library tinggal ubah **1 file** (`utils/icons.js`).

### Theming System

Semua warna via **CSS Custom Properties**:

```css
:root {
  --c-primary: #3b82f6;
  --c-text: #f1f5f9;
}

[data-bs-theme="light"] {
  --c-primary: #2563eb;
  --c-text: #0f172a;
}
```

Toggle theme cukup ubah `data-bs-theme` di `<html>`.

### Logging

Semua log ke console + file (`logs/`):

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

**Rotasi:** max 5MB per file, 5 backup (30MB total max).

---

## 🌐 Deployment

### VPS Setup (Ubuntu 22.04)

#### 1. Install Dependencies

```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx unzip curl
```

#### 2. Setup Project

```bash
sudo mkdir -p /opt/vtrack
sudo chown $USER:$USER /opt/vtrack
cd /opt/vtrack
git clone https://github.com/your-username/vtrack.git .
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### 3. Download PocketBase

```bash
mkdir pocketbase
cd pocketbase
wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.x/pocketbase_0.22.x_linux_amd64.zip
unzip pocketbase_0.22.x_linux_amd64.zip
chmod +x pocketbase
```

#### 4. Configure PocketBase Service

Buat `/etc/systemd/system/pocketbase.service`:

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

#### 5. Setup Nginx + SSL

```bash
sudo certbot --nginx -d vt.yourdomain.com
```

#### 6. Configure Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Backup

**Backup PocketBase:**

```bash
# Backup database + files
tar -czf backup-$(date +%Y%m%d).tar.gz /opt/vtrack/pocketbase/pb_data/

# Upload ke S3 / Google Drive
```

**Cron backup otomatis:**

```bash
# Edit crontab
crontab -e

# Tambahkan — backup harian jam 2 pagi, keep 30 hari
0 2 * * * cd /opt/vtrack && tar -czf /backups/vtrack-$(date +\%Y\%m\%d).tar.gz pocketbase/pb_data/ .env && find /backups -name "vtrack-*.tar.gz" -mtime +30 -delete
```

---

## 🐛 Troubleshooting

### Mini App: "Cookie session tidak tersimpan"

**Penyebab:** Konfigurasi cookie salah.

**Solusi:**

```bash
# .env
SESSION_COOKIE_SAMESITE=None
SESSION_COOKIE_SECURE=1
```

Pastikan juga Mini App di-serve via **HTTPS**.

### Bot: "Unauthorized" saat registrasi

**Penyebab:** HMAC signature mismatch — `BOT_API_KEY` beda antara bot & backend.

**Solusi:**

1. Regenerate `BOT_API_KEY`:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

2. Update `.env` — pastikan **sama persis** di bot & backend
3. Restart **kedua** service

**Cek log backend:**

```
[register] ❌ HMAC fail: Invalid signature (IP: 127.0.0.1)
```

### Change Password: "oldPassword: Cannot be blank"

**Penyebab:** PocketBase require field `oldPassword` saat update password.

**Solusi:** Sudah diperbaiki di v1.1 — backend sekarang kirim `oldPassword`.

### Change Password: Session invalid setelah sukses

**Penyebab:** PocketBase invalidate token lama setelah password berubah.

**Solusi:** Sudah diperbaiki di v1.1 — auto-logout + redirect ke login.

### Dashboard tidak render (blank)

**Penyebab:** Script JS tidak ter-load atau error.

**Debug:**

1. Buka DevTools → Console → cek error
2. Cek Network tab → semua script status 200
3. Cek load order di HTML (utils → core → shared → layout → views → form → main)
4. Cek `window.VT` di console:

```javascript
window.VT.state      // { view: 'dashboard', ... }
window.VT.api        // function
window.VT.icon       // function
```

### Icon tidak muncul

**Penyebab:** Font Awesome CDN tidak load, atau class salah.

**Debug:**

1. DevTools → Network → cek `all.min.css` status 200
2. Inspect `<i>` → cek `font-family` = "Font Awesome 6 Free"
3. Class harus `fa-solid fa-xxx` (2 prefix)

### Sidebar ikut scroll

**Penyebab:** `position: sticky` tidak bekerja.

**Solusi:** Sudah diperbaiki di v1.1 — body di-lock `overflow: hidden`, `.app-content` yang scroll.

### Log tidak ditulis ke file

**Penyebab:** Permission atau folder `logs/` tidak ada.

**Solusi:**

```bash
# Cek folder
ls -la logs/

# Buat manual kalau perlu
mkdir -p logs
chmod 755 logs
```

### PocketBase connection timeout

**Penyebab:** Network flaky atau PB down.

**Solusi:**

- Client sudah punya retry logic (4 attempt dengan exponential backoff)
- Cek PocketBase status: `systemctl status pocketbase`
- Cek log PocketBase

---

## 📝 Changelog

### v1.1.0 (2026-09-24) — Registration & Account Management

**✨ New Features:**
- Registrasi via Bot Telegram (tanpa buka web)
- HMAC-signed request (bot → backend)
- Edit profil (nama, email, no_hp)
- Ganti password dengan validasi + oldPassword
- Hapus akun self-service
- Halaman Laporan & Analisa
- Bot commands: `/myaccount`, `/stats`, `/broadcast`
- Auto-track login (`login_count`, `last_login_at`)
- Audit trail collection `registration_log`
- UI Settings baru dengan struktur kartu

**🔧 Fixes:**
- Fix HMAC mismatch (Solusi A)
- Fix PocketBase `oldPassword` requirement
- Fix session invalid redirect
- Fix sidebar overflow
- Fix theme awareness untuk sidebar mobile
- Fix password policy (min 8 char, relaxed)

**🎨 UI/UX:**
- Font Awesome 6 (migrasi dari Bootstrap Icons)
- Modular CSS (28 files)
- Modular JS (25 files dengan layered architecture)
- Icon registry pattern
- Enhanced light mode

**🔒 Security:**
- 5-layer security untuk registrasi
- Nonce cache (anti-replay)
- Timestamp window (30s)
- Rate limiting (tg_id + IP)
- Auto-delete password message (60s)

### v1.0.0 (2026-09-20) — Initial Release

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

## 🙏 Kredit & Acknowledgments

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

## 📞 Kontak & Dukungan

- **Issues**: [GitHub Issues](https://github.com/your-username/vtrack/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/vtrack/discussions)
- **Email**: your-email@example.com
- **Telegram**: [@YourUsername](https://t.me/YourUsername)

---

## ⭐ Dukung Project

Kalau aplikasi ini bermanfaat, beri ⭐ di [GitHub](https://github.com/your-username/vtrack)!

---

<div align="center">

**Made with ❤️ for vehicle owners everywhere**

[⬆ Kembali ke atas](#-vehicle-tracker)

