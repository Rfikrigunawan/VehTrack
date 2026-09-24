#!/usr/bin/env python3
"""
Vehicle Tracker — Telegram Bot (Optimized v1.1)
================================================
Fitur:
  • Registrasi akun langsung dari bot (tanpa buka web)
  • Link akun lama via /link <token>
  • Quick view: /status, /reminders, /myaccount
  • Daily reminder otomatis @ 08:00 WIB
  • Mini App menu button + inline button
  • Admin commands: /stats, /broadcast

Keamanan:
  • HMAC signature ke backend (anti fake bot)
  • Timestamp + nonce (anti replay)
  • Rate limiting per user
  • Escape Markdown (anti injection)
  • Auto-delete password message (60s)
  • Conversation timeout (5 menit)

Jalankan:
    python bot.py
"""

import os
import re
import time
import signal
import logging
import logging.handlers
import asyncio
from pathlib import Path
from datetime import datetime, time as dt_time, timezone, timedelta
from typing import Optional, List, Dict, Any, Set, Tuple
from collections import defaultdict

import hmac
import hashlib
import json
import secrets

import requests
from dotenv import load_dotenv
from telegram import (
    Update,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    MenuButtonWebApp,
    WebAppInfo,
    BotCommand,
    BotCommandScopeDefault,
    BotCommandScopeChat,
)
from telegram.constants import ParseMode
from telegram.error import TelegramError, Forbidden, BadRequest
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    CallbackQueryHandler,
    ConversationHandler,
    filters,
)


# =====================================================================
# LOGGING — Console + Rotating File
# =====================================================================
LOG_DIR = Path(__file__).parent / "logs"
LOG_DIR.mkdir(exist_ok=True)

LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
LOG_DATE_FMT = "%Y-%m-%d %H:%M:%S"

root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)

for h in root_logger.handlers[:]:
    root_logger.removeHandler(h)

formatter = logging.Formatter(LOG_FORMAT, datefmt=LOG_DATE_FMT)

console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
console_handler.setLevel(logging.INFO)
root_logger.addHandler(console_handler)

file_handler = logging.handlers.RotatingFileHandler(
    LOG_DIR / "bot.log",
    maxBytes=5 * 1024 * 1024,
    backupCount=5,
    encoding="utf-8",
)
file_handler.setFormatter(formatter)
file_handler.setLevel(logging.INFO)
root_logger.addHandler(file_handler)

# Reduce noise
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)
logging.getLogger("telegram.ext.Application").setLevel(logging.INFO)
logging.getLogger("telegram.Bot").setLevel(logging.INFO)

log = logging.getLogger("vt-bot")


# =====================================================================
# CONFIG & ENV
# =====================================================================
load_dotenv()

PB_URL = os.getenv("PB_URL", "https://acer-pb.gwan.my.id").rstrip("/")
PB_ADMIN_EMAIL = os.getenv("PB_ADMIN_EMAIL", "")
PB_ADMIN_PASSWORD = os.getenv("PB_ADMIN_PASSWORD", "")

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
BOT_USERNAME = os.getenv("TELEGRAM_BOT_USERNAME", "").lstrip("@")
WEBAPP_URL = os.getenv("WEBAPP_URL", "").rstrip("/")

# Backend untuk registrasi
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:5000").rstrip("/")
BOT_API_KEY = os.getenv("BOT_API_KEY", "")

# Admin Telegram IDs (comma-separated)
ADMIN_IDS: Set[int] = set()
_admin_ids_raw = os.getenv("ADMIN_TELEGRAM_IDS", "")
if _admin_ids_raw:
    for x in _admin_ids_raw.split(","):
        try:
            ADMIN_IDS.add(int(x.strip()))
        except ValueError:
            pass

# Timezone WIB
WIB = timezone(timedelta(hours=7))
DAILY_HOUR_WIB = int(os.getenv("DAILY_HOUR_WIB", "8"))

# Link token
TOKEN_MAX_AGE_SEC = 5 * 60

# Rate limiting
_RATE_LIMIT_WINDOW = 60
_RATE_LIMIT_MAX = 10
_rate_limit_cache: Dict[int, List[float]] = {}

# Registrasi rate limit
_REG_RATE_LIMIT: Dict[int, List[float]] = defaultdict(list)


# =====================================================================
# VALIDASI ENV
# =====================================================================
if not BOT_TOKEN:
    raise SystemExit("❌ TELEGRAM_BOT_TOKEN belum di-set di .env")

if not PB_ADMIN_EMAIL or not PB_ADMIN_PASSWORD:
    raise SystemExit("❌ PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD belum di-set di .env")

if not WEBAPP_URL:
    log.warning("⚠️  WEBAPP_URL belum di-set — Mini App menu button tidak akan muncul")

if not BOT_API_KEY:
    log.warning("⚠️  BOT_API_KEY belum di-set — registrasi via bot tidak akan jalan")

if not BACKEND_URL:
    log.warning("⚠️  BACKEND_URL belum di-set — registrasi via bot tidak akan jalan")


# =====================================================================
# POCKETBASE ADMIN CLIENT
# =====================================================================
class AdminPB:
    """PocketBase admin client dengan auto-reconnect + retry."""

    MAX_RETRIES = 3
    BACKOFF_BASE = 0.5
    TIMEOUT = (10, 30)

    def __init__(self, url: str, email: str, password: str):
        self.url = url.rstrip("/")
        self.email = email
        self.password = password
        self.token: Optional[str] = None

        self._session = requests.Session()
        self._session.headers.update({
            "User-Agent": "VehicleTracker-Bot/1.1",
        })

        self._login()

    def _login(self):
        try:
            r = self._session.post(
                f"{self.url}/api/collections/_superusers/auth-with-password",
                json={"identity": self.email, "password": self.password},
                timeout=self.TIMEOUT,
            )
            r.raise_for_status()
            self.token = r.json()["token"]
            log.info("✅ Admin PB login OK")
        except requests.RequestException as e:
            log.error("❌ Admin PB login gagal: %s", e)
            raise

    def _headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    def _request(self, method: str, path: str, **kwargs) -> Any:
        url = f"{self.url}{path}"
        kwargs.setdefault("timeout", self.TIMEOUT)

        last_exc: Optional[Exception] = None

        for attempt in range(self.MAX_RETRIES):
            try:
                r = self._session.request(
                    method, url,
                    headers=self._headers(),
                    **kwargs,
                )

                if r.status_code == 401:
                    log.warning("PB token expired, re-login...")
                    self._login()
                    r = self._session.request(
                        method, url,
                        headers=self._headers(),
                        **kwargs,
                    )

                r.raise_for_status()

                if r.status_code == 204 or not r.content:
                    return None
                return r.json()

            except requests.RequestException as e:
                last_exc = e
                if attempt < self.MAX_RETRIES - 1:
                    sleep_s = self.BACKOFF_BASE * (2 ** attempt)
                    log.warning(
                        "PB request gagal (attempt %d/%d): %s — retry in %.1fs",
                        attempt + 1, self.MAX_RETRIES, e, sleep_s,
                    )
                    time.sleep(sleep_s)
                    continue
                log.error("PB request gagal setelah %d attempt: %s",
                          self.MAX_RETRIES, e)
                raise

        if last_exc:
            raise last_exc

    def list(self, collection: str, **params) -> Dict:
        return self._request(
            "GET", f"/api/collections/{collection}/records", params=params,
        )

    def get(self, collection: str, rid: str) -> Dict:
        return self._request(
            "GET", f"/api/collections/{collection}/records/{rid}",
        )

    def update(self, collection: str, rid: str, data: Dict) -> Dict:
        return self._request(
            "PATCH", f"/api/collections/{collection}/records/{rid}", json=data,
        )

    def close(self):
        self._session.close()


# Init global client (fail-fast)
pb = AdminPB(PB_URL, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD)

# Bot start time
_BOT_START_TIME = time.time()


# =====================================================================
# HELPERS — HMAC & Rate Limit
# =====================================================================
def sign_request(payload: dict) -> dict:
    """Sign payload dengan HMAC untuk request ke backend."""
    payload = dict(payload)
    payload["_ts"] = int(time.time())
    payload["_nonce"] = secrets.token_urlsafe(16)

    message = json.dumps(payload, sort_keys=True, separators=(",", ":"))

    signature = hmac.new(
        BOT_API_KEY.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()

    payload["_signature"] = signature
    return payload


def check_reg_rate_limit(tg_id: int) -> bool:
    """Check rate limit untuk registrasi (per telegram_id)."""
    now = time.time()
    history = _REG_RATE_LIMIT[tg_id]
    history[:] = [t for t in history if now - t < 3600]
    if len(history) >= 3:
        return False
    history.append(now)
    return True


def is_rate_limited(user_id: int) -> bool:
    """Simple rate limiting per user untuk command."""
    now = time.time()
    history = _rate_limit_cache.get(user_id, [])
    history = [t for t in history if now - t < _RATE_LIMIT_WINDOW]
    history.append(now)
    _rate_limit_cache[user_id] = history
    return len(history) > _RATE_LIMIT_MAX


def is_admin(user_id: int) -> bool:
    return user_id in ADMIN_IDS


# =====================================================================
# HELPERS — Format & Escape
# =====================================================================
TOKEN_RE = re.compile(r"^\d{10}\.[A-Za-z0-9_-]{16,}$")


def escape_md(s: str) -> str:
    """Escape karakter Markdown V1."""
    if not s:
        return ""
    for ch in ("_", "*", "`", "["):
        s = s.replace(ch, f"\\{ch}")
    return s


def escape_filter(s: str) -> str:
    """Escape string untuk PocketBase filter."""
    if s is None:
        return ""
    s = str(s)
    s = s.replace("\\", "\\\\")
    s = s.replace('"', '\\"')
    return s


def fmt_date(date_str: str) -> str:
    """Format tanggal ISO ke format Indonesia."""
    if not date_str:
        return "-"
    try:
        s = date_str.replace("Z", "+00:00")
        if "." in s and "+" not in s:
            s = s.split(".")[0]
        d = datetime.fromisoformat(s.replace(" ", "T"))
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        d_wib = d.astimezone(WIB)
        bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
                 "Jul", "Ags", "Sep", "Okt", "Nov", "Des"]
        return f"{d_wib.day} {bulan[d_wib.month - 1]} {d_wib.year}"
    except (ValueError, AttributeError):
        return date_str[:10] if date_str else "-"


def days_until(date_str: str) -> Optional[int]:
    """Hitung selisih hari dari hari ini (WIB)."""
    if not date_str:
        return None
    try:
        s = date_str.replace("Z", "+00:00")
        if "." in s and "+" not in s:
            s = s.split(".")[0]
        d = datetime.fromisoformat(s.replace(" ", "T"))
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        d_wib = d.astimezone(WIB).date()
        now_wib = datetime.now(WIB).date()
        return (d_wib - now_wib).days
    except (ValueError, AttributeError):
        return None


def is_token_fresh(token: str, max_age_sec: int = TOKEN_MAX_AGE_SEC) -> bool:
    try:
        ts_str, _ = token.split(".", 1)
        return (time.time() - int(ts_str)) < max_age_sec
    except (ValueError, AttributeError):
        return False


# =====================================================================
# USER RESOLVER (with cache)
# =====================================================================
_USER_CACHE: Dict[int, Dict] = {}
_USER_CACHE_TTL = 60


def find_user_by_telegram_id(tg_id: int) -> Optional[Dict]:
    now = time.time()
    cached = _USER_CACHE.get(tg_id)
    if cached and (now - cached["_ts"]) < _USER_CACHE_TTL:
        return cached["data"]

    try:
        res = pb.list(
            "users",
            filter=f'telegram_id="{escape_filter(str(tg_id))}"',
            perPage=1,
        )
        items = res.get("items", [])
        if items:
            _USER_CACHE[tg_id] = {"data": items[0], "_ts": now}
            return items[0]
        return None
    except Exception as e:
        log.error("find_user_by_telegram_id error: %s", e)
        return None


def find_user_by_link_token(token: str) -> Optional[Dict]:
    try:
        res = pb.list(
            "users",
            filter=f'telegram_link_token="{escape_filter(token)}"',
            perPage=1,
        )
        items = res.get("items", [])
        return items[0] if items else None
    except Exception as e:
        log.error("find_user_by_link_token error: %s", e)
        return None


# =====================================================================
# DECORATORS
# =====================================================================
def rate_limited(func):
    """Rate limiting decorator per user."""
    async def wrapper(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
        user = update.effective_user
        if user and is_rate_limited(user.id):
            log.warning("Rate limited: user %d", user.id)
            try:
                await update.effective_message.reply_text(
                    "⚠️ Terlalu banyak perintah. Tunggu sebentar ya."
                )
            except Exception:
                pass
            return
        return await func(update, ctx)
    return wrapper


# =====================================================================
# BOT LIFECYCLE
# =====================================================================
async def post_init(application: Application):
    """Set commands & menu button."""
    try:
        commands = [
            BotCommand("start", "Mulai & menu utama"),
            BotCommand("status", "Status kendaraan"),
            BotCommand("reminders", "Daftar pengingat aktif"),
            BotCommand("myaccount", "Info akun Anda"),
            BotCommand("link", "Link akun (dengan token)"),
            BotCommand("unlink", "Putuskan tautan Telegram"),
            BotCommand("help", "Bantuan"),
            BotCommand("ping", "Cek latency bot"),
        ]
        await application.bot.set_my_commands(
            commands,
            scope=BotCommandScopeDefault(),
        )
        log.info("✅ Commands list di-set (default scope)")

        if ADMIN_IDS:
            admin_commands = commands + [
                BotCommand("stats", "Statistik bot (admin)"),
                BotCommand("broadcast", "Broadcast pesan (admin)"),
            ]
            for admin_id in ADMIN_IDS:
                try:
                    await application.bot.set_my_commands(
                        admin_commands,
                        scope=BotCommandScopeChat(chat_id=admin_id),
                    )
                except Exception as e:
                    log.warning("Gagal set admin cmd untuk %d: %s", admin_id, e)
            log.info("✅ Admin commands di-set untuk %d admin", len(ADMIN_IDS))

    except Exception as e:
        log.error("Gagal set commands: %s", e)

    if WEBAPP_URL:
        try:
            await application.bot.set_chat_menu_button(
                menu_button=MenuButtonWebApp(
                    text="Buka App",
                    web_app=WebAppInfo(url=WEBAPP_URL),
                )
            )
            log.info("✅ Menu button Mini App di-set → %s", WEBAPP_URL)
        except Exception as e:
            log.error("Gagal set menu button: %s", e)
    else:
        log.warning("⚠️  WEBAPP_URL kosong — menu button tidak di-set")


async def post_shutdown(application: Application):
    """Cleanup."""
    log.info("🛑 Bot shutting down...")

    try:
        pb.close()
        log.info("✅ PocketBase session closed")
    except Exception as e:
        log.warning("Error closing PB session: %s", e)

    _rate_limit_cache.clear()
    _USER_CACHE.clear()
    _REG_RATE_LIMIT.clear()

    log.info("✅ Shutdown complete")


# =====================================================================
# KEYBOARD BUILDERS
# =====================================================================
def webapp_inline_keyboard() -> Optional[InlineKeyboardMarkup]:
    if not WEBAPP_URL:
        return None
    return InlineKeyboardMarkup([[
        InlineKeyboardButton(
            "🚗 Buka Vehicle Tracker",
            web_app=WebAppInfo(url=WEBAPP_URL),
        )
    ]])


# =====================================================================
# REGISTRATION CONVERSATION
# =====================================================================
(REG_NAME, REG_EMAIL, REG_CONFIRM) = range(3)
CONVERSATION_TIMEOUT = 300


async def reg_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    """Mulai registrasi."""
    query = update.callback_query
    if query:
        await query.answer()

    user = update.effective_user
    msg = update.effective_message
    if not user or not msg:
        return ConversationHandler.END

    existing = find_user_by_telegram_id(user.id)
    if existing:
        await msg.reply_text(
            f"✅ Anda sudah terdaftar sebagai "
            f"*{escape_md(existing.get('name', '-'))}*.\n\n"
            f"Ketik /start untuk menu utama.",
            parse_mode=ParseMode.MARKDOWN,
        )
        return ConversationHandler.END

    if not check_reg_rate_limit(user.id):
        await msg.reply_text(
            "⚠️ Terlalu banyak percobaan registrasi.\n"
            "Coba lagi 1 jam lagi."
        )
        return ConversationHandler.END

    await msg.reply_text(
        "📝 *Registrasi Akun Baru*\n\n"
        "Siapa *nama lengkap* Anda?\n"
        "_(2-50 karakter, huruf & spasi)_\n\n"
        "Ketik /cancel untuk batal.",
        parse_mode=ParseMode.MARKDOWN,
    )
    return REG_NAME


async def reg_name(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    """Handle input nama."""
    msg = update.effective_message
    if not msg or not msg.text:
        return REG_NAME

    name = msg.text.strip()

    if name.startswith("/"):
        await msg.reply_text(
            "❌ Sepertinya Anda mengetik command.\n"
            "Kirim nama Anda, atau /cancel untuk batal:"
        )
        return REG_NAME

    if len(name) < 2 or len(name) > 50:
        await msg.reply_text("❌ Nama harus 2-50 karakter. Coba lagi:")
        return REG_NAME

    if not re.match(r"^[a-zA-Z0-9\s\.\'-]+$", name):
        await msg.reply_text(
            "❌ Nama hanya boleh huruf, angka, spasi, titik, apostrof.\n"
            "Coba lagi:"
        )
        return REG_NAME

    ctx.user_data["reg_name"] = name

    await msg.reply_text(
        f"✅ Nama: *{escape_md(name)}*\n\n"
        f"Sekarang, masukkan *email* Anda:\n\n"
        f"Email berguna untuk:\n"
        f"• Reset password\n"
        f"• Notifikasi penting\n\n"
        f"Ketik /skip untuk lewati, atau /cancel untuk batal.",
        parse_mode=ParseMode.MARKDOWN,
    )
    return REG_EMAIL


async def reg_email(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    """Handle input email."""
    msg = update.effective_message
    if not msg or not msg.text:
        return REG_EMAIL

    text = msg.text.strip()

    if text == "/skip":
        ctx.user_data["reg_email"] = ""
    else:
        if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", text):
            await msg.reply_text(
                "❌ Format email tidak valid.\n"
                "Coba lagi, atau /skip untuk lewati:"
            )
            return REG_EMAIL

        if len(text) > 254:
            await msg.reply_text(
                "❌ Email terlalu panjang.\n"
                "Coba lagi, atau /skip untuk lewati:"
            )
            return REG_EMAIL

        ctx.user_data["reg_email"] = text.lower()

    name = ctx.user_data["reg_name"]
    email = ctx.user_data.get("reg_email", "")

    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("✅ Ya, Daftar", callback_data="reg_confirm"),
            InlineKeyboardButton("❌ Batal", callback_data="reg_cancel"),
        ]
    ])

    await msg.reply_text(
        f"📋 *Konfirmasi Data:*\n\n"
        f"👤 Nama: *{escape_md(name)}*\n"
        f"📧 Email: `{escape_md(email) if email else '(tidak diisi)'}`\n"
        f"💬 Telegram: @{escape_md(update.effective_user.username or '-')}\n\n"
        f"Lanjut daftar?",
        parse_mode=ParseMode.MARKDOWN,
        reply_markup=keyboard,
    )
    return REG_CONFIRM


async def reg_confirm(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    """Handle konfirmasi."""
    query = update.callback_query
    if not query:
        return ConversationHandler.END

    await query.answer()

    if query.data == "reg_cancel":
        await query.edit_message_text("❌ Registrasi dibatalkan.")
        ctx.user_data.clear()
        return ConversationHandler.END

    user = update.effective_user
    name = ctx.user_data.get("reg_name", "")
    email = ctx.user_data.get("reg_email", "")

    await query.edit_message_text("⏳ Membuat akun...")

    payload = sign_request({
        "telegram_id": str(user.id),
        "telegram_username": user.username or "",
        "name": name,
        "email": email,
    })

    try:
        r = requests.post(
            f"{BACKEND_URL}/api/auth/register-via-telegram",
            json=payload,
            timeout=20,
        )
        data = r.json()

        if r.status_code != 200:
            error = data.get("error", "Terjadi kesalahan")

            if r.status_code == 409 and data.get("action") == "login":
                await query.edit_message_text(
                    "✅ Anda sudah terdaftar!\n\n"
                    "Ketik /start untuk membuka menu."
                )
                ctx.user_data.clear()
                return ConversationHandler.END

            await query.edit_message_text(
                f"❌ *Registrasi gagal:*\n\n"
                f"{escape_md(error)}\n\n"
                f"Coba lagi nanti atau hubungi admin.",
                parse_mode=ParseMode.MARKDOWN,
            )
            ctx.user_data.clear()
            return ConversationHandler.END

        password = data["password"]
        email_final = data["email"]

        pwd_msg = await query.edit_message_text(
            f"✅ *Akun berhasil dibuat!*\n\n"
            f"📋 *Informasi Akun:*\n"
            f"👤 Nama: *{escape_md(name)}*\n"
            f"📧 Email: `{escape_md(email_final)}`\n"
            f"💬 Telegram: @{escape_md(user.username or '-')}\n\n"
            f"🔐 *Password sementara:*\n"
            f"`{password}`\n\n"
            f"⚠️ *PENTING:*\n"
            f"• GANTI password di Pengaturan setelah login\n"
            f"• Pesan ini akan *dihapus dalam 60 detik*\n"
            f"• Simpan password di tempat aman",
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=webapp_inline_keyboard(),
        )

        if ctx.job_queue:
            ctx.job_queue.run_once(
                _delete_message_job,
                when=60,
                data={
                    "chat_id": pwd_msg.chat_id,
                    "message_id": pwd_msg.message_id,
                },
                name=f"del_pwd_{pwd_msg.message_id}",
            )

        log.info("✅ User registered via bot: tg_id=%s, name=%s", user.id, name)

    except requests.RequestException as e:
        log.exception("Register request error")
        await query.edit_message_text(
            "❌ Gagal terhubung ke server.\n"
            "Coba lagi nanti atau hubungi admin."
        )

    ctx.user_data.clear()
    return ConversationHandler.END


async def reg_cancel(update: Update, ctx: ContextTypes.DEFAULT_TYPE) -> int:
    """Cancel registrasi."""
    msg = update.effective_message
    if msg:
        await msg.reply_text(
            "❌ Registrasi dibatalkan.\n\n"
            "Ketik /start untuk memulai ulang."
        )
    ctx.user_data.clear()
    return ConversationHandler.END


async def _delete_message_job(ctx: ContextTypes.DEFAULT_TYPE):
    """Auto-delete pesan password."""
    data = ctx.job.data
    try:
        await ctx.bot.delete_message(
            chat_id=data["chat_id"],
            message_id=data["message_id"],
        )
        log.info("[register] Password message auto-deleted")
    except Exception as e:
        log.debug("[register] Gagal hapus pesan: %s", e)


def get_registration_handler() -> ConversationHandler:
    return ConversationHandler(
        entry_points=[
            CallbackQueryHandler(reg_start, pattern="^reg_start$"),
        ],
        states={
            REG_NAME: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, reg_name),
            ],
            REG_EMAIL: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, reg_email),
                CommandHandler("skip", reg_email),
            ],
            REG_CONFIRM: [
                CallbackQueryHandler(
                    reg_confirm,
                    pattern="^reg_(confirm|cancel)$",
                ),
            ],
        },
        fallbacks=[
            CommandHandler("cancel", reg_cancel),
        ],
        conversation_timeout=CONVERSATION_TIMEOUT,
        per_message=False,
    )


# =====================================================================
# COMMAND: /start
# =====================================================================
@rate_limited
async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    msg = update.effective_message
    user = update.effective_user
    if not msg or not user:
        return

    existing = find_user_by_telegram_id(user.id)

    if existing:
        name = escape_md(existing.get("name", "user"))
        text = (
            f"👋 Halo *{name}*!\n\n"
            f"Selamat datang kembali di Vehicle Tracker.\n\n"
            f"*Menu cepat:*\n"
            f"• /status — status kendaraan\n"
            f"• /reminders — pengingat aktif\n"
            f"• /myaccount — info akun\n"
            f"• /help — bantuan lengkap\n\n"
            f"Tap tombol di bawah untuk buka Mini App 👇"
        )
        kb = webapp_inline_keyboard()
        try:
            await msg.reply_text(text, parse_mode=ParseMode.MARKDOWN, reply_markup=kb)
        except BadRequest:
            await msg.reply_text(text.replace("*", ""), reply_markup=kb)
        return

    text = (
        "🚗 *Selamat datang di Vehicle Tracker Bot!*\n\n"
        "Bot ini membantu Anda:\n"
        "• 🚗 Mengelola kendaraan\n"
        "• 🔧 Mencatat servis\n"
        "• ⛽ Tracking BBM\n"
        "• 📄 Manajemen dokumen\n"
        "• 🔔 Pengingat otomatis\n\n"
        "━━━━━━━━━━━━━━━━━━━━\n\n"
        "Pilih cara akses:"
    )

    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("📝 Daftar Akun Baru", callback_data="reg_start")],
        [InlineKeyboardButton("🔗 Link Akun Lama", callback_data="link_start")],
    ])

    try:
        await msg.reply_text(text, parse_mode=ParseMode.MARKDOWN, reply_markup=keyboard)
    except BadRequest:
        await msg.reply_text(text.replace("*", ""), reply_markup=keyboard)


async def link_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """Handler untuk tombol 'Link Akun Lama'."""
    query = update.callback_query
    await query.answer()

    await query.edit_message_text(
        "🔗 *Link Akun Lama*\n\n"
        "Untuk link akun yang sudah ada:\n\n"
        "1. Buka web Vehicle Tracker di browser\n"
        "2. Login ke akun Anda\n"
        "3. Buka *Pengaturan → Link Telegram*\n"
        "4. Copy token yang muncul\n"
        "5. Kirim ke bot ini:\n"
        "   `/link <token>`\n\n"
        "Token berlaku 5 menit dan hanya bisa dipakai sekali.",
        parse_mode=ParseMode.MARKDOWN,
    )


# =====================================================================
# COMMAND: /help
# =====================================================================
@rate_limited
async def cmd_help(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    msg = update.effective_message
    if not msg:
        return

    text = (
        "🚗 *Vehicle Tracker Bot — Bantuan*\n\n"
        "*Registrasi:*\n"
        "• /start — daftar akun baru atau buka menu\n\n"
        "*Command Utama:*\n"
        "• /status — status semua kendaraan\n"
        "• /reminders — daftar pengingat aktif\n"
        "• /myaccount — info akun Anda\n"
        "• /ping — cek latency bot\n\n"
        "*Akun:*\n"
        "• /link `<token>` — link akun Telegram\n"
        "• /unlink — putuskan tautan\n\n"
        "*Mini App:*\n"
        "Tap menu button *Buka App* di pojok kiri chat, "
        "atau tombol biru di pesan /start.\n\n"
        f"📅 Bot akan mengirim notifikasi pengingat otomatis "
        f"setiap hari pukul *{DAILY_HOUR_WIB}:00 WIB*."
    )
    try:
        await msg.reply_text(text, parse_mode=ParseMode.MARKDOWN)
    except BadRequest:
        await msg.reply_text(text.replace("*", "").replace("`", ""))


# =====================================================================
# COMMAND: /myaccount
# =====================================================================
@rate_limited
async def cmd_myaccount(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    msg = update.effective_message
    user = update.effective_user
    if not msg or not user:
        return

    vt = find_user_by_telegram_id(user.id)
    if not vt:
        await msg.reply_text("⚠️ Anda belum terdaftar. Ketik /start.")
        return

    try:
        vehicles_res = pb.list(
            "vehicles",
            filter=f'owner="{escape_filter(vt["id"])}"',
            perPage=1,
        )
        vehicle_count = vehicles_res.get("totalItems", 0)
    except Exception:
        vehicle_count = 0

    linked_at = fmt_date(vt.get("telegram_linked_at", ""))
    registered_at = fmt_date(vt.get("registered_at", ""))
    password_status = "Set ✓" if vt.get("password_set") else "Default ⚠️"

    text = (
        "👤 *Info Akun Anda*\n\n"
        f"🆔 ID: `{escape_md(vt['id'][:8])}...`\n"
        f"👤 Nama: *{escape_md(vt.get('name', '-'))}*\n"
        f"📧 Email: `{escape_md(vt.get('email', '-'))}`\n"
        f"💬 Telegram: @{escape_md(vt.get('telegram_username') or '-')}\n\n"
        f"📊 *Statistik:*\n"
        f"🚗 Kendaraan: *{vehicle_count}*\n"
        f"🔐 Password: {password_status}\n"
        f"📅 Terdaftar: {registered_at}\n"
        f"🔗 Link Telegram: {linked_at}\n\n"
        f"Untuk ganti password, buka Mini App → Pengaturan."
    )

    kb = webapp_inline_keyboard()
    try:
        await msg.reply_text(text, parse_mode=ParseMode.MARKDOWN, reply_markup=kb)
    except BadRequest:
        await msg.reply_text(text.replace("*", "").replace("`", ""), reply_markup=kb)


# =====================================================================
# COMMAND: /link <token>
# =====================================================================
@rate_limited
async def cmd_link(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    msg = update.effective_message
    user = update.effective_user
    if not msg or not user:
        return

    args = ctx.args or []
    token = args[0].strip() if args else ""

    if not token:
        await msg.reply_text(
            "⚠️ Format: `/link <token>`\n\n"
            "Contoh:\n`/link 1726987654.abc123def456`\n\n"
            "Token bisa didapat dari web app → *Pengaturan* → *Link Telegram*.",
            parse_mode=ParseMode.MARKDOWN,
        )
        return

    if not TOKEN_RE.match(token):
        await msg.reply_text(
            "❌ Token tidak valid. Format: `<unix_ts>.<random>`",
            parse_mode=ParseMode.MARKDOWN,
        )
        return

    if not is_token_fresh(token):
        await msg.reply_text(
            "❌ Token *kadaluarsa* atau tidak valid.\n\n"
            "Silakan generate ulang dari web app:\n"
            "*Pengaturan → Link Telegram*",
            parse_mode=ParseMode.MARKDOWN,
        )
        return

    target = find_user_by_link_token(token)
    if not target:
        await msg.reply_text(
            "❌ Token tidak ditemukan.\n"
            "Pastikan Anda copy token terbaru dari web app."
        )
        return

    already = find_user_by_telegram_id(user.id)
    if already and already["id"] != target["id"]:
        await msg.reply_text(
            f"⚠️ Akun Telegram ini sudah di-link ke akun lain "
            f"(*{escape_md(already.get('email', '-'))}*).\n\n"
            f"Kirim /unlink dulu, lalu /link lagi dengan token baru.",
            parse_mode=ParseMode.MARKDOWN,
        )
        return

    # Atomic update
    try:
        verify = pb.list(
            "users",
            filter=(
                f'id="{escape_filter(target["id"])}" '
                f'&& telegram_link_token="{escape_filter(token)}"'
            ),
            perPage=1,
        )
        if not verify.get("items"):
            await msg.reply_text(
                "❌ Token sudah dipakai atau kadaluarsa.\n"
                "Generate token baru dari web app."
            )
            return

        pb.update("users", target["id"], {
            "telegram_id": str(user.id),
            "telegram_username": user.username or "",
            "telegram_linked_at": datetime.now(timezone.utc).isoformat(),
            "telegram_link_token": "",
        })

        _USER_CACHE.pop(user.id, None)

    except Exception as e:
        log.exception("Gagal update user saat link")
        await msg.reply_text("❌ Gagal link akun. Coba lagi atau hubungi admin.")
        return

    log.info("✅ User %s linked to telegram %s", target["id"], user.id)

    kb = webapp_inline_keyboard()
    await msg.reply_text(
        f"✅ *Berhasil di-link!*\n\n"
        f"Akun Telegram Anda sudah tersambung dengan akun "
        f"`{escape_md(target.get('email', '-'))}`.\n\n"
        f"Anda akan menerima notifikasi pengingat otomatis.\n\n"
        f"Tap tombol di bawah untuk buka Mini App 👇",
        parse_mode=ParseMode.MARKDOWN,
        reply_markup=kb,
    )


# =====================================================================
# COMMAND: /unlink
# =====================================================================
@rate_limited
async def cmd_unlink(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    msg = update.effective_message
    if not user or not msg:
        return

    vt = find_user_by_telegram_id(user.id)
    if not vt:
        await msg.reply_text("⚠️ Akun ini belum ter-link.")
        return

    try:
        pb.update("users", vt["id"], {
            "telegram_id": "",
            "telegram_username": "",
            "telegram_linked_at": "",
            "telegram_link_token": "",
        })
        _USER_CACHE.pop(user.id, None)
    except Exception as e:
        log.exception("Gagal unlink")
        await msg.reply_text("❌ Gagal unlink. Coba lagi.")
        return

    await msg.reply_text(
        "✅ Akun Telegram Anda sudah diputus dari Vehicle Tracker.\n\n"
        "Untuk link ulang, buka web app → *Pengaturan* → *Link Telegram*.",
        parse_mode=ParseMode.MARKDOWN,
    )


# =====================================================================
# COMMAND: /status
# =====================================================================
@rate_limited
async def cmd_status(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    msg = update.effective_message
    if not user or not msg:
        return

    vt = find_user_by_telegram_id(user.id)
    if not vt:
        await msg.reply_text(
            "⚠️ Akun belum ter-link.\n\n"
            "Ketik /start untuk daftar atau link akun.",
            parse_mode=ParseMode.MARKDOWN,
        )
        return

    try:
        res = pb.list(
            "vehicles",
            filter=f'owner="{escape_filter(vt["id"])}"',
            sort="-created",
            perPage=20,
        )
    except Exception as e:
        log.exception("Gagal query vehicles")
        await msg.reply_text("❌ Gagal ambil data. Coba lagi nanti.")
        return

    items = res.get("items", [])
    if not items:
        await msg.reply_text("🚗 Belum ada kendaraan terdaftar.")
        return

    name = escape_md(vt.get("name", "Anda"))
    lines = [f"🚗 *Status Kendaraan — {name}*\n"]

    for v in items:
        jenis = v.get("jenis", "lainnya")
        icon = {"motor": "🏍️", "mobil": "🚗"}.get(jenis, "🚙")
        odo = int(v.get("odometer_terakhir") or 0)
        odo_str = f"{odo:,}".replace(",", ".")
        nama = escape_md(v.get("nama", "-"))
        plat = escape_md(v.get("plat_nomor", "-"))

        lines.append(
            f"{icon} *{nama}*\n"
            f"   Plat: `{plat}`\n"
            f"   Odometer: *{odo_str} km*\n"
        )

    kb = webapp_inline_keyboard()
    try:
        await msg.reply_text(
            "\n".join(lines),
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=kb,
        )
    except BadRequest:
        await msg.reply_text(
            "\n".join(lines).replace("*", "").replace("`", ""),
            reply_markup=kb,
        )


# =====================================================================
# COMMAND: /reminders
# =====================================================================
@rate_limited
async def cmd_reminders(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    msg = update.effective_message
    if not user or not msg:
        return

    vt = find_user_by_telegram_id(user.id)
    if not vt:
        await msg.reply_text(
            "⚠️ Akun belum ter-link. Ketik /start.",
            parse_mode=ParseMode.MARKDOWN,
        )
        return

    try:
        res = pb.list(
            "reminders",
            filter=f'owner="{escape_filter(vt["id"])}" && status="pending"',
            sort="created",
            perPage=50,
        )
        vehicles = pb.list(
            "vehicles",
            filter=f'owner="{escape_filter(vt["id"])}"',
            perPage=50,
        )
    except Exception as e:
        log.exception("Gagal query reminders")
        await msg.reply_text("❌ Gagal ambil data. Coba lagi nanti.")
        return

    vmap = {v["id"]: v for v in vehicles.get("items", [])}
    items = res.get("items", [])

    if not items:
        await msg.reply_text("🎉 Tidak ada pengingat aktif.")
        return

    lines = ["🔔 *Daftar Pengingat Aktif*\n"]

    for r in items:
        v = vmap.get(r.get("vehicle"), {})
        vname = escape_md(v.get("nama", "-"))
        judul = escape_md(r.get("judul", "-"))

        if r.get("tipe") == "km":
            target = int(r.get("target_km") or 0)
            current = int(v.get("odometer_terakhir") or 0)
            sisa = target - current
            sisa_str = f"{abs(sisa):,}".replace(",", ".")

            if sisa < 0:
                status = f"🔴 LEWAT {sisa_str} km"
            elif sisa == 0:
                status = "🔴 SEKARANG!"
            elif sisa <= 500:
                status = f"🟡 {sisa_str} km lagi"
            else:
                status = f"🔵 {sisa_str} km lagi"

            target_str = f"{target:,}".replace(",", ".")
            detail = f"target {target_str} km"
        else:
            d = days_until(r.get("target_date"))
            if d is None:
                status = "❔"
                detail = "-"
            elif d < 0:
                status = f"🔴 LEWAT {abs(d)} hari"
            elif d == 0:
                status = "🔴 HARI INI!"
            elif d <= 7:
                status = f"🟡 {d} hari lagi"
            else:
                status = f"🔵 {d} hari lagi"
            detail = fmt_date(r.get("target_date", ""))

        lines.append(
            f"{status}\n"
            f"  *{judul}* ({vname})\n"
            f"  {detail}\n"
        )

    kb = webapp_inline_keyboard()
    try:
        await msg.reply_text(
            "\n".join(lines),
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=kb,
        )
    except BadRequest:
        await msg.reply_text(
            "\n".join(lines).replace("*", "").replace("`", ""),
            reply_markup=kb,
        )


# =====================================================================
# COMMAND: /ping
# =====================================================================
async def cmd_ping(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    msg = update.effective_message
    if not msg:
        return
    start = time.time()
    m = await msg.reply_text("🏓 Pinging...")
    latency = (time.time() - start) * 1000
    await m.edit_text(
        f"🏓 Pong!\n\n"
        f"⏱️ Latency: `{latency:.0f}ms`\n"
        f"🤖 Bot: @{BOT_USERNAME or 'unknown'}\n"
        f"🌐 PB: `{PB_URL}`",
        parse_mode=ParseMode.MARKDOWN,
    )


# =====================================================================
# COMMAND: /stats (Admin)
# =====================================================================
async def cmd_stats(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    msg = update.effective_message
    if not user or not msg:
        return

    if not is_admin(user.id):
        await msg.reply_text("⛔ Command ini hanya untuk admin.")
        return

    try:
        users_res = pb.list("users", perPage=1)
        total_users = users_res.get("totalItems", 0)

        linked_res = pb.list("users", filter='telegram_id!=""', perPage=1)
        linked_users = linked_res.get("totalItems", 0)

        vehicles_res = pb.list("vehicles", perPage=1)
        total_vehicles = vehicles_res.get("totalItems", 0)

        services_res = pb.list("service_records", perPage=1)
        fuels_res = pb.list("fuel_logs", perPage=1)
        docs_res = pb.list("documents", perPage=1)
        reminders_res = pb.list("reminders", filter='status="pending"', perPage=1)

        text = (
            "📊 *Bot Statistics*\n\n"
            f"*Users:*\n"
            f"  Total: {total_users}\n"
            f"  Linked: {linked_users} ({linked_users * 100 // max(total_users, 1)}%)\n\n"
            f"*Data:*\n"
            f"  Kendaraan: {total_vehicles}\n"
            f"  Servis: {services_res.get('totalItems', 0)}\n"
            f"  BBM: {fuels_res.get('totalItems', 0)}\n"
            f"  Dokumen: {docs_res.get('totalItems', 0)}\n"
            f"  Reminder aktif: {reminders_res.get('totalItems', 0)}\n\n"
            f"*Bot:*\n"
            f"  Uptime: {int(time.time() - _BOT_START_TIME)} detik\n"
            f"  Rate limited users: {len(_rate_limit_cache)}\n"
            f"  Cached users: {len(_USER_CACHE)}"
        )
        await msg.reply_text(text, parse_mode=ParseMode.MARKDOWN)

    except Exception as e:
        log.exception("Gagal ambil stats")
        await msg.reply_text(f"❌ Error: {e}")


# =====================================================================
# COMMAND: /broadcast (Admin)
# =====================================================================
async def cmd_broadcast(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    msg = update.effective_message
    if not user or not msg:
        return

    if not is_admin(user.id):
        await msg.reply_text("⛔ Command ini hanya untuk admin.")
        return

    if ctx.args:
        broadcast_text = " ".join(ctx.args)
    elif msg.reply_to_message:
        broadcast_text = msg.reply_to_message.text or ""
    else:
        await msg.reply_text(
            "📢 *Format Broadcast:*\n\n"
            "• `/broadcast <pesan>` — kirim teks langsung\n"
            "• Reply ke pesan + `/broadcast` — broadcast pesan tersebut",
            parse_mode=ParseMode.MARKDOWN,
        )
        return

    if not broadcast_text.strip():
        await msg.reply_text("⚠️ Pesan kosong.")
        return

    await msg.reply_text(
        f"📢 Broadcast ke semua user ter-link...\n\n"
        f"Pesan:\n_{escape_md(broadcast_text[:200])}_",
        parse_mode=ParseMode.MARKDOWN,
    )

    try:
        users_res = pb.list("users", filter='telegram_id!=""', perPage=200)
        users = users_res.get("items", [])
    except Exception as e:
        await msg.reply_text(f"❌ Gagal query users: {e}")
        return

    sent = 0
    failed = 0

    for u in users:
        tg_id = u.get("telegram_id")
        if not tg_id:
            continue
        try:
            await ctx.bot.send_message(
                chat_id=int(tg_id),
                text=f"📢 *Pengumuman*\n\n{broadcast_text}",
                parse_mode=ParseMode.MARKDOWN,
            )
            sent += 1
            await asyncio.sleep(0.05)
        except Forbidden:
            failed += 1
        except TelegramError as e:
            log.warning("Broadcast fail ke %s: %s", tg_id, e)
            failed += 1

    await msg.reply_text(
        f"✅ Broadcast selesai!\n\n"
        f"Berhasil: {sent}\n"
        f"Gagal: {failed}"
    )


# =====================================================================
# DAILY REMINDER JOB
# =====================================================================
async def daily_reminder_job(ctx: ContextTypes.DEFAULT_TYPE):
    """Kirim notifikasi reminder harian @ 08:00 WIB."""
    log.info("⏰ Running daily reminder job")

    try:
        users_res = pb.list("users", filter='telegram_id!=""', perPage=200)
    except Exception as e:
        log.error("daily job: gagal list users: %s", e)
        return

    users = users_res.get("items", [])
    log.info("Daily job: %d user(s) with Telegram linked", len(users))

    sent_count = 0
    for user in users:
        try:
            success = await _notify_user(user, ctx)
            if success:
                sent_count += 1
        except Exception as e:
            log.exception("Daily job: error untuk user %s", user.get("id"))

    log.info("✅ Daily job selesai: %d user(s) dinotif", sent_count)


async def _notify_user(user: Dict, ctx: ContextTypes.DEFAULT_TYPE) -> bool:
    """Kirim notif reminder ke user."""
    uid = user["id"]
    tg_id = user.get("telegram_id")
    if not tg_id:
        return False

    try:
        vehicles = pb.list(
            "vehicles",
            filter=f'owner="{escape_filter(uid)}"',
            perPage=50,
        )
        vmap = {v["id"]: v for v in vehicles.get("items", [])}

        reminders = pb.list(
            "reminders",
            filter=f'owner="{escape_filter(uid)}" && status="pending"',
            perPage=100,
        )
    except Exception as e:
        log.error("Failed fetch data for %s: %s", uid, e)
        return False

    if not reminders.get("items"):
        return False

    alerts = []
    for r in reminders["items"]:
        v = vmap.get(r.get("vehicle"))
        if not v:
            continue

        if r.get("tipe") == "km":
            sisa = int(r.get("target_km") or 0) - int(v.get("odometer_terakhir") or 0)
            if sisa <= 500:
                label = "🔴 LEWAT" if sisa < 0 else "🟡 SEGERA"
                sisa_str = f"{abs(sisa):,}".replace(",", ".")
                alerts.append((r, v, f"{label}: {sisa_str} km"))
        else:
            d = days_until(r.get("target_date"))
            if d is not None and d <= 7:
                label = "🔴 LEWAT" if d < 0 else "🟡 SEGERA"
                alerts.append((r, v, f"{label}: {abs(d)} hari"))

    if not alerts:
        return False

    name = escape_md(user.get("name", "Anda"))
    lines = [f"🔔 *Pengingat Hari Ini — {name}*\n"]

    for r, v, status in alerts:
        judul = escape_md(r.get("judul", "-"))
        vname = escape_md(v.get("nama", "-"))
        lines.append(
            f"• *{judul}* ({vname})\n"
            f"  {status}"
        )

    lines.append("\nKirim /reminders untuk detail lengkap.")

    try:
        await ctx.bot.send_message(
            chat_id=int(tg_id),
            text="\n".join(lines),
            parse_mode=ParseMode.MARKDOWN,
        )
        log.info("✅ Notif terkirim ke %s", tg_id)
        return True
    except Forbidden:
        log.warning("User %s block bot, skip", tg_id)
        return False
    except TelegramError as e:
        log.warning("Gagal kirim ke %s: %s", tg_id, e)
        return False


# =====================================================================
# FALLBACK HANDLER
# =====================================================================
async def handle_unknown(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    msg = update.effective_message
    if not msg:
        return

    kb = webapp_inline_keyboard()
    await msg.reply_text(
        "🤖 Maaf, saya tidak mengerti pesan itu.\n\n"
        "Coba command:\n"
        "• /start — menu utama\n"
        "• /status — status kendaraan\n"
        "• /reminders — pengingat aktif\n"
        "• /help — bantuan lengkap\n\n"
        "Atau tap tombol di bawah untuk buka Mini App 👇",
        parse_mode=ParseMode.MARKDOWN,
        reply_markup=kb,
    )


# =====================================================================
# ERROR HANDLER
# =====================================================================
async def error_handler(update: object, ctx: ContextTypes.DEFAULT_TYPE):
    log.error("Exception while handling update:", exc_info=ctx.error)

    if isinstance(update, Update) and update.effective_message:
        try:
            await update.effective_message.reply_text(
                "⚠️ Terjadi kesalahan internal. Coba lagi nanti atau "
                "hubungi admin."
            )
        except Exception:
            pass


# =====================================================================
# MAIN
# =====================================================================
def main():
    log.info("🚀 Starting bot @%s", BOT_USERNAME or "(unknown)")
    log.info("🌐 PocketBase: %s", PB_URL)
    log.info("📱 WebApp URL: %s", WEBAPP_URL or "(not set)")
    log.info("🔗 Backend URL: %s", BACKEND_URL)
    log.info("🔐 BOT_API_KEY: %s", "✓ set" if BOT_API_KEY else "✗ NOT SET")
    log.info("👤 Admins: %s", ADMIN_IDS or "(none)")

    app = (
        Application.builder()
        .token(BOT_TOKEN)
        .post_init(post_init)
        .post_shutdown(post_shutdown)
        .build()
    )

    # ---------- Conversation Handlers (HARUS sebelum yang lain) ----------
    app.add_handler(get_registration_handler())

    # ---------- Command Handlers ----------
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("myaccount", cmd_myaccount))
    app.add_handler(CommandHandler("link", cmd_link))
    app.add_handler(CommandHandler("unlink", cmd_unlink))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("reminders", cmd_reminders))
    app.add_handler(CommandHandler("ping", cmd_ping))

    # ---------- Callback Handlers ----------
    app.add_handler(CallbackQueryHandler(link_start, pattern="^link_start$"))

    # ---------- Admin Commands ----------
    app.add_handler(CommandHandler("stats", cmd_stats))
    app.add_handler(CommandHandler("broadcast", cmd_broadcast))

    # ---------- Fallback (paling akhir) ----------
    app.add_handler(MessageHandler(
        filters.TEXT & ~filters.COMMAND,
        handle_unknown,
    ))

    # ---------- Error Handler ----------
    app.add_error_handler(error_handler)

    # ---------- Daily Job ----------
    if app.job_queue:
        app.job_queue.run_daily(
            daily_reminder_job,
            time=dt_time(hour=DAILY_HOUR_WIB, minute=0, tzinfo=WIB),
            name="daily_reminder",
        )
        log.info("⏰ Daily job dijadwalkan jam %02d:00 WIB", DAILY_HOUR_WIB)
    else:
        log.warning(
            "⚠️  JobQueue tidak tersedia. "
            "Install python-telegram-bot[job-queue]."
        )

    log.info("🤖 Bot polling... (Ctrl+C untuk stop)")

    app.run_polling(
        allowed_updates=Update.ALL_TYPES,
        drop_pending_updates=True,
    )


# =====================================================================
# ENTRY POINT
# =====================================================================
if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log.info("🛑 Bot dihentikan oleh user (Ctrl+C)")
    except Exception as e:
        log.exception("❌ Bot crash: %s", e)
        raise