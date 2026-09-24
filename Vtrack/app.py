"""
Vehicle Tracker — Flask backend + PocketBase proxy + Telegram linking + Mini App

Fitur:
  - Auth (login, register, logout, me) via PocketBase
  - Registrasi via Bot Telegram (HMAC-signed)
  - Update profile (nama, email, no HP)
  - Change password (dari Mini App)
  - Delete account
  - Telegram linking (generate-token, unlink, clear-token)
  - Telegram Mini App auto-login via initData verification
  - Vehicles CRUD + file upload
  - Child collections (services, fuel_logs, documents, reminders)
  - Business logic: auto-update odometer, konsumsi km/L, validasi numerik
  - File proxy dari PocketBase
  - SPA routing untuk /app/* dan /tg-app/*
  - JSON error handler untuk /api/*

Jalankan:
    python app.py
"""
import os
import re
import time as _time
import secrets
import hashlib
import hmac
import json
import logging
import logging.handlers
from datetime import timedelta, datetime, timezone
from functools import wraps
from pathlib import Path
from typing import Optional
from urllib.parse import parse_qsl
from collections import defaultdict

from werkzeug.middleware.proxy_fix import ProxyFix
import requests
from flask import (
    Flask, render_template, request, jsonify,
    session, redirect, url_for, Response, stream_with_context,
)
from dotenv import load_dotenv

from pocketbase_client import PocketBaseClient, PocketBaseError

load_dotenv()


# --------------------------------------------------------------------- #
# Logging — Console + File (rotating)
# --------------------------------------------------------------------- #
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
    LOG_DIR / "app.log",
    maxBytes=5 * 1024 * 1024,
    backupCount=5,
    encoding="utf-8",
)
file_handler.setFormatter(formatter)
file_handler.setLevel(logging.INFO)
root_logger.addHandler(file_handler)

log = logging.getLogger("vt-web")


# --------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------- #
app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "dev-secret-change-me")
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE=os.getenv("SESSION_COOKIE_SAMESITE", "Lax"),
    SESSION_COOKIE_SECURE=os.getenv("SESSION_COOKIE_SECURE", "0") == "1",
    SESSION_COOKIE_NAME="vt_session",
    PERMANENT_SESSION_LIFETIME=timedelta(days=7),
    JSON_SORT_KEYS=False,
)
app.wsgi_app = ProxyFix(
    app.wsgi_app,
    x_for=1,
    x_proto=1,
    x_host=1,
    x_port=1,
)

ALLOWED_CHILD_COLLECTIONS = {
    "service_records", "fuel_logs", "documents", "reminders",
}
TOKEN_MAX_AGE_SEC = 5 * 60

# Validation rules per collection: {field: (min, max)}
NUMERIC_RULES = {
    "vehicles": {
        "tahun":             (1900, 2100),
        "odometer_terakhir": (0, None),
    },
    "service_records": {
        "odometer":        (0, None),
        "biaya":           (0, None),
        "next_service_km": (0, None),
    },
    "fuel_logs": {
        "odometer":        (0, None),
        "liter":           (0.01, 1000),
        "harga_per_liter": (0, None),
        "total_biaya":     (0, None),
        "konsumsi":        (0, None),
    },
    "documents": {
        "biaya": (0, None),
    },
    "reminders": {
        "target_km": (0, None),
    },
}

# Bot ↔ Backend security
BOT_API_KEY = os.getenv("BOT_API_KEY", "")

# Nonce cache (anti replay attack)
_NONCE_CACHE: dict = {}
_NONCE_TTL = 60

# Rate limit storage (in-memory)
_RATE_LIMITS = defaultdict(list)

# Password strength: min length
PASSWORD_MIN_LENGTH = 8


# --------------------------------------------------------------------- #
# Helpers — Session & Auth
# --------------------------------------------------------------------- #
def get_client() -> PocketBaseClient:
    """PocketBase client untuk user yang login."""
    return PocketBaseClient(token=session.get("pb_token"))


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("pb_token") or not session.get("user_id"):
            if request.path.startswith("/api/"):
                return jsonify({"error": "Unauthorized"}), 401
            return redirect(url_for("index"))
        return view(*args, **kwargs)
    return wrapped


def api_error(e: PocketBaseError):
    return jsonify({"error": e.message, "data": e.data}), e.status_code


def extract_payload():
    """
    Return (data_dict, files_list|None).
    Support JSON & multipart/form-data.
    """
    ctype = (request.content_type or "").lower()

    if "multipart/form-data" in ctype:
        data = {}
        for key in request.form:
            val = request.form.get(key)
            if val in ("true", "false"):
                data[key] = (val == "true")
            else:
                data[key] = val
        files = []
        for field_name in request.files:
            for f in request.files.getlist(field_name):
                if f and f.filename:
                    files.append((field_name, (f.filename, f.read(), f.mimetype)))
        return data, (files or None)

    return (request.get_json(force=True, silent=True) or {}), None


def store_session(result: dict):
    """Simpan token & user info dari PocketBase ke Flask session."""
    record = result.get("record", {})
    session["pb_token"] = result.get("token")
    session["user_id"] = record.get("id")
    session["user_email"] = record.get("email")
    session["user_name"] = record.get("name", "")
    session.permanent = True


def _make_link_token() -> str:
    """Format: <unix_ts>.<random>."""
    return f"{int(_time.time())}.{secrets.token_urlsafe(16)}"


def _validate_numbers(data: dict, collection: str):
    """Validasi field numerik berdasarkan NUMERIC_RULES[collection]."""
    rules = NUMERIC_RULES.get(collection)
    if not rules:
        return

    for field, (min_v, max_v) in rules.items():
        if field not in data:
            continue
        val = data[field]
        if val is None or val == "":
            continue

        try:
            f = float(val)
        except (TypeError, ValueError):
            raise PocketBaseError(f"Field '{field}' harus berupa angka.", 400)

        if f != f or f in (float("inf"), float("-inf")):
            raise PocketBaseError(f"Field '{field}' bukan angka yang valid.", 400)

        if min_v is not None and f < min_v:
            raise PocketBaseError(
                f"Field '{field}' minimal {min_v} (diisi: {f}).",
                400,
            )
        if max_v is not None and f > max_v:
            raise PocketBaseError(
                f"Field '{field}' maksimal {max_v} (diisi: {f}).",
                400,
            )


# --------------------------------------------------------------------- #
# Helpers — Telegram Mini App initData verification
# --------------------------------------------------------------------- #
def verify_telegram_init_data(init_data: str) -> Optional[dict]:
    """Verifikasi initData dari Telegram Mini App."""
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if not bot_token or not init_data:
        return None

    try:
        pairs = dict(parse_qsl(init_data, strict_parsing=True))
    except ValueError:
        log.warning("[tg-auth] gagal parse initData")
        return None

    received_hash = pairs.pop("hash", None)
    if not received_hash:
        log.warning("[tg-auth] hash tidak ada di initData")
        return None

    data_check_string = "\n".join(
        f"{k}={v}" for k, v in sorted(pairs.items())
    )

    secret_key = hmac.new(
        b"WebAppData",
        bot_token.encode(),
        hashlib.sha256,
    ).digest()

    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        log.warning("[tg-auth] hash mismatch")
        return None

    try:
        auth_date = int(pairs.get("auth_date", "0"))
    except ValueError:
        return None

    if _time.time() - auth_date > 86400:
        log.warning("[tg-auth] auth_date kadaluarsa")
        return None

    try:
        user_data = json.loads(pairs.get("user", "{}"))
    except json.JSONDecodeError:
        log.warning("[tg-auth] user JSON invalid")
        return None

    return user_data


# --------------------------------------------------------------------- #
# Helpers — Bot ↔ Backend HMAC
# --------------------------------------------------------------------- #
def verify_bot_signature(payload: dict) -> tuple[bool, str]:
    """
    Verify HMAC signature dari bot.
    Signature dihitung dari payload + _ts + _nonce (TANPA _signature).

    Return: (is_valid, error_message)
    """
    if not BOT_API_KEY:
        return False, "BOT_API_KEY tidak di-set di server"

    payload = dict(payload)
    signature = payload.pop("_signature", None)
    ts = payload.pop("_ts", None)
    nonce = payload.pop("_nonce", None)

    if not all([signature, ts, nonce]):
        return False, "Missing signature/ts/nonce"

    try:
        ts = int(ts)
    except (TypeError, ValueError):
        return False, "Invalid timestamp"

    now = int(_time.time())
    if abs(now - ts) > 30:
        return False, f"Timestamp expired (diff={abs(now - ts)}s)"

    if nonce in _NONCE_CACHE:
        return False, "Nonce already used"

    cutoff = now - _NONCE_TTL
    for n, t in list(_NONCE_CACHE.items()):
        if t < cutoff:
            del _NONCE_CACHE[n]

    # ⚡ Reconstruct payload LENGKAP (dengan _ts + _nonce)
    verify_payload = {
        **payload,
        "_ts": ts,
        "_nonce": nonce,
    }

    message = json.dumps(verify_payload, sort_keys=True, separators=(",", ":"))
    expected = hmac.new(
        BOT_API_KEY.encode(),
        message.encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(signature, expected):
        log.warning("[hmac-debug] signature mismatch")
        log.warning("[hmac-debug] expected:  %s", expected)
        log.warning("[hmac-debug] received:  %s", signature)
        log.warning("[hmac-debug] message:   %s", message)
        return False, "Invalid signature"

    _NONCE_CACHE[nonce] = now
    return True, ""


def check_rate_limit(key: str, max_requests: int, window_sec: int) -> bool:
    """Return True kalau masih dalam limit."""
    now = _time.time()
    history = _RATE_LIMITS[key]
    history[:] = [t for t in history if now - t < window_sec]

    if len(history) >= max_requests:
        return False

    history.append(now)
    return True


def _generate_secure_password(length: int = 16) -> str:
    """Generate password yang aman (no ambiguity characters)."""
    lowercase = "abcdefghjkmnpqrstuvwxyz"
    uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    digits = "23456789"
    symbols = "!@#$%^&*-_=+"

    password_chars = [
        secrets.choice(lowercase),
        secrets.choice(uppercase),
        secrets.choice(digits),
        secrets.choice(symbols),
    ]

    all_chars = lowercase + uppercase + digits + symbols
    for _ in range(length - 4):
        password_chars.append(secrets.choice(all_chars))

    for i in range(len(password_chars) - 1, 0, -1):
        j = secrets.randbelow(i + 1)
        password_chars[i], password_chars[j] = password_chars[j], password_chars[i]

    return "".join(password_chars)




def _check_password_strength(password: str) -> tuple[bool, str]:
    """
    Return: (is_valid, error_message)
    Password policy (RELAXED):
      - Minimal 6 karakter
      - Tidak wajib simbol
      - Tidak wajib huruf besar/kecil
    """
    if not password:
        return False, "Password wajib diisi"

    if len(password) < PASSWORD_MIN_LENGTH:
        return False, f"Password minimal {PASSWORD_MIN_LENGTH} karakter (saat ini: {len(password)})"

    return True, ""


def _check_password_strength_bool(password: str) -> bool:
    """Wrapper buat compatibility."""
    valid, _ = _check_password_strength(password)
    return valid


def _pb_admin_login() -> str:
    """Login sebagai admin PocketBase, return token."""
    pb_url = os.getenv("PB_URL", "").rstrip("/")
    admin_email = os.getenv("PB_ADMIN_EMAIL", "")
    admin_pwd = os.getenv("PB_ADMIN_PASSWORD", "")

    if not all([pb_url, admin_email, admin_pwd]):
        raise ValueError("Konfigurasi admin PocketBase tidak lengkap")

    r = requests.post(
        f"{pb_url}/api/collections/_superusers/auth-with-password",
        json={"identity": admin_email, "password": admin_pwd},
        timeout=15,
    )
    r.raise_for_status()
    return r.json()["token"]


def _pb_find_user_by_telegram_id(admin_token: str, tg_id: str) -> Optional[dict]:
    """Cari user by telegram_id pakai admin token."""
    pb_url = os.getenv("PB_URL", "").rstrip("/")
    try:
        r = requests.get(
            f"{pb_url}/api/collections/users/records",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"filter": f'telegram_id="{tg_id}"', "perPage": 1},
            timeout=15,
        )
        r.raise_for_status()
        items = r.json().get("items", [])
        return items[0] if items else None
    except Exception as e:
        log.error("[register] find_by_tg error: %s", e)
        return None


def _pb_find_user_by_email(admin_token: str, email: str) -> Optional[dict]:
    """Cari user by email pakai admin token."""
    pb_url = os.getenv("PB_URL", "").rstrip("/")
    try:
        r = requests.get(
            f"{pb_url}/api/collections/users/records",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"filter": f'email="{email}"', "perPage": 1},
            timeout=15,
        )
        r.raise_for_status()
        items = r.json().get("items", [])
        return items[0] if items else None
    except Exception as e:
        log.error("[register] find_by_email error: %s", e)
        return None


def _log_registration(data: dict):
    """Simpan log registrasi ke PocketBase (best-effort)."""
    try:
        admin_token = _pb_admin_login()
        pb_url = os.getenv("PB_URL", "").rstrip("/")

        requests.post(
            f"{pb_url}/api/collections/registration_log/records",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=data,
            timeout=10,
        )
    except Exception as e:
        log.warning("[register] Gagal audit log: %s", e)


# --------------------------------------------------------------------- #
# Pages
# --------------------------------------------------------------------- #
@app.route("/")
def index():
    if session.get("pb_token"):
        return redirect(url_for("app_page"))
    return render_template(
        "index.html",
        bot_username=os.getenv("TELEGRAM_BOT_USERNAME", "").lstrip("@"),
    )


@app.route("/app")
@app.route("/app/<path:page>")
@login_required
def app_page(page=None):
    """SPA-style untuk web browser."""
    return render_template("app.html", user={
        "id": session.get("user_id"),
        "email": session.get("user_email"),
        "name": session.get("user_name", ""),
        "is_mini_app": False,
    })


@app.route("/tg-app")
@app.route("/tg-app/<path:page>")
def tg_app_page(page=None):
    """Serve Telegram Mini App (SPA). Auth via initData di JS."""
    return render_template("teleapp.html", user={
        "id": session.get("user_id", ""),
        "email": session.get("user_email", ""),
        "name": session.get("user_name", ""),
    })


# --------------------------------------------------------------------- #
# Auth API
# --------------------------------------------------------------------- #
@app.post("/api/auth/login")
def api_login():
    data = request.get_json(force=True) or {}
    identity = (data.get("identity") or "").strip()
    password = data.get("password") or ""
    if not identity or not password:
        return jsonify({"error": "Email dan password wajib diisi"}), 400

    client = PocketBaseClient()
    try:
        result = client.auth_with_password(identity, password)
    except PocketBaseError as e:
        return api_error(e)

    store_session(result)

    # Track login stats
    try:
        c = get_client()
        user = c.get_record("users", session["user_id"])
        login_count = (user.get("login_count") or 0) + 1
        c.update_record("users", session["user_id"], {
            "login_count": login_count,
            "last_login_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        log.warning("[login] Gagal update login stats: %s", e)

    return jsonify({"user": {
        "id": session["user_id"],
        "email": session["user_email"],
        "name": session["user_name"],
    }})


@app.post("/api/auth/register")
def api_register():
    """Register via web (opsional)."""
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip()
    password = data.get("password") or ""
    password_confirm = data.get("passwordConfirm") or password
    name = (data.get("name") or "").strip()

    if not email or not password:
        return jsonify({"error": "Email dan password wajib diisi"}), 400
    if password != password_confirm:
        return jsonify({"error": "Konfirmasi password tidak sama"}), 400

    valid, err = _check_password_strength(password)
    if not valid:
        return jsonify({"error": err}), 400

    client = PocketBaseClient()
    try:
        client.register_user(email, password, password_confirm, name)
        result = client.auth_with_password(email, password)
    except PocketBaseError as e:
        return api_error(e)

    store_session(result)
    return jsonify({"user": {
        "id": session["user_id"],
        "email": session["user_email"],
        "name": session["user_name"],
    }})


@app.post("/api/auth/logout")
def api_logout():
    session.clear()
    return jsonify({"ok": True})


@app.get("/api/auth/me")
@login_required
def api_me():
    client = get_client()
    try:
        record = client.get_record("users", session["user_id"])
    except PocketBaseError as e:
        session.clear()
        return api_error(e)

    bot_username = os.getenv("TELEGRAM_BOT_USERNAME", "").lstrip("@")

    return jsonify({"user": {
        "id": record.get("id"),
        "email": record.get("email"),
        "name": record.get("name", ""),
        "no_hp": record.get("no_hp", ""),
        "telegram_id": record.get("telegram_id", ""),
        "telegram_username": record.get("telegram_username", ""),
        "telegram_linked_at": record.get("telegram_linked_at", ""),
        "telegram_link_token": record.get("telegram_link_token", ""),
        "telegram_bot_username": bot_username,
        # Extended fields
        "verified": record.get("verified", False),
        "is_verified": record.get("is_verified", False),
        "password_set": record.get("password_set", False),
        "password_temporary": record.get("password_temporary", False),
        "registered_via": record.get("registered_via", "web"),
        "registered_at": record.get("registered_at", ""),
        "last_login_at": record.get("last_login_at", ""),
        "login_count": record.get("login_count", 0),
    }})


# --------------------------------------------------------------------- #
# Auth — Update Profile
# --------------------------------------------------------------------- #
@app.patch("/api/auth/update-profile")
@login_required
def api_update_profile():
    """
    Update profile user (nama, email, no_hp).
    
    ⚡ FIX: Tambah debug log detail supaya tahu kenapa 400.
    """
    data = request.get_json(force=True) or {}

    # ⚡ DEBUG LOG
    log.info("[update-profile] Payload: %s", json.dumps(data, ensure_ascii=False))
    log.info("[update-profile] User: %s", session.get("user_id"))

    update_data = {}
    errors = []

    # ---------- Name ----------
    if "name" in data:
        name = (data.get("name") or "").strip()
        log.info("[update-profile] name='%s' (len=%d)", name, len(name))

        if not name:
            errors.append("Nama wajib diisi")
        elif len(name) < 2:
            errors.append(f"Nama minimal 2 karakter (saat ini: {len(name)})")
        elif len(name) > 50:
            errors.append(f"Nama maksimal 50 karakter (saat ini: {len(name)})")
        elif not re.match(r"^[a-zA-Z0-9\s\.\'-]+$", name):
            errors.append("Nama hanya boleh huruf, angka, spasi, titik, apostrof")
        else:
            update_data["name"] = name

    # ---------- Email ----------
    if "email" in data:
        email = (data.get("email") or "").strip().lower()
        log.info("[update-profile] email='%s'", email)

        if not email:
            errors.append("Email wajib diisi")
        elif len(email) > 254:
            errors.append("Email terlalu panjang")
        elif not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
            errors.append(f"Format email tidak valid: '{email}'")
        else:
            update_data["email"] = email

    # ---------- No HP ----------
    if "no_hp" in data:
        no_hp = (data.get("no_hp") or "").strip()
        log.info("[update-profile] no_hp='%s'", no_hp)

        if no_hp:
            # Normalize: hapus spasi, dash, titik, kurung
            no_hp_clean = re.sub(r"[\s\-\.\(\)]", "", no_hp)

            # ⚡ FIX: Perluas regex + pesan jelas
            # Format valid: 
            #   - 08xxxxxxxx (10-13 digit setelah 0)
            #   - +62xxxxxxxxx
            #   - 62xxxxxxxxx
            if re.match(r"^0[0-9]{9,12}$", no_hp_clean):
                # 08123456789 (10-13 digit total)
                update_data["no_hp"] = no_hp_clean
            elif re.match(r"^(\+62|62)[0-9]{9,12}$", no_hp_clean):
                # +62812345678 atau 62812345678
                update_data["no_hp"] = no_hp_clean
            else:
                errors.append(
                    f"Format no HP tidak valid: '{no_hp}'. "
                    "Contoh: 08123456789 atau +6281234567890"
                )
        else:
            # Empty string = hapus no_hp
            update_data["no_hp"] = ""

    if errors:
        log.warning("[update-profile] Validation errors: %s", errors)
        return jsonify({"error": errors[0], "errors": errors}), 400

    if not update_data:
        return jsonify({"error": "Tidak ada data yang diubah"}), 400

    # ---------- Check email duplicate ----------
    if "email" in update_data:
        try:
            admin_token = _pb_admin_login()
            pb_url = os.getenv("PB_URL", "").rstrip("/")

            r = requests.get(
                f"{pb_url}/api/collections/users/records",
                headers={"Authorization": f"Bearer {admin_token}"},
                params={
                    "filter": f'email="{update_data["email"]}" && id!="{session["user_id"]}"',
                    "perPage": 1,
                },
                timeout=15,
            )
            r.raise_for_status()
            if r.json().get("items"):
                log.warning("[update-profile] Email duplicate: %s", update_data["email"])
                return jsonify({"error": "Email sudah digunakan oleh akun lain"}), 409
        except Exception as e:
            log.exception("[update-profile] Check email duplicate error")
            return jsonify({"error": "Server error saat cek email"}), 500

    # ---------- Update via PocketBase ----------
    client = get_client()
    try:
        client.update_record("users", session["user_id"], update_data)
    except PocketBaseError as e:
        log.error("[update-profile] PB error: %s", e.message)
        return api_error(e)

    # Update session
    if "name" in update_data:
        session["user_name"] = update_data["name"]
    if "email" in update_data:
        session["user_email"] = update_data["email"]

    log.info("[update-profile] ✅ Updated fields: %s", list(update_data.keys()))

    return jsonify({
        "ok": True,
        "message": "Profil berhasil diperbarui",
        "updated": list(update_data.keys()),
    })



# --------------------------------------------------------------------- #
# Auth — Change Password
# --------------------------------------------------------------------- #
@app.post("/api/auth/change-password")
@login_required
def api_change_password():
    """
    Ganti password user (dari Mini App).

    ⚠️  PENTING: PocketBase memerlukan field `oldPassword` saat
    update password. Tanpa field ini, PocketBase reject dengan
    error: "oldPassword: Cannot be blank."
    """
    data = request.get_json(force=True) or {}
    old_password = data.get("old_password", "")
    new_password = data.get("new_password", "")
    new_password_confirm = data.get("new_password_confirm", "")

    # ⚡ DEBUG LOG
    log.info("[change-password] Debug:")
    log.info("  old_password len:  %d", len(old_password))
    log.info("  new_password len:  %d", len(new_password))
    log.info("  confirm len:       %d", len(new_password_confirm))
    log.info("  match:             %s", new_password == new_password_confirm)

    # ---------- Validasi ----------
    if not old_password:
        return jsonify({"error": "Password lama wajib diisi"}), 400

    if not new_password:
        return jsonify({"error": "Password baru wajib diisi"}), 400

    if new_password != new_password_confirm:
        return jsonify({"error": "Konfirmasi password tidak sama"}), 400

    if old_password == new_password:
        return jsonify({"error": "Password baru harus berbeda dari password lama"}), 400

    valid, err = _check_password_strength(new_password)
    if not valid:
        log.warning("[change-password] Strength fail: %s", err)
        return jsonify({"error": err}), 400

    # ---------- Verify old password (extra safety) ----------
    client = get_client()
    try:
        user_email = session.get("user_email")
        if not user_email:
            return jsonify({"error": "Session tidak valid"}), 401

        client.auth_with_password(user_email, old_password)
        log.info("[change-password] Old password verified")
    except PocketBaseError as e:
        log.warning("[change-password] Old password salah: %s", e.message)
        return jsonify({"error": "Password lama salah"}), 401

    # ---------- Update password ----------
    # ⚡ FIX: Sertakan `oldPassword` field — PocketBase requirement!
    try:
        client.update_record("users", session["user_id"], {
            "oldPassword": old_password,       # ⬅️ WAJIB!
            "password": new_password,
            "passwordConfirm": new_password,
            "password_temporary": False,
            "password_set": True,
        })
        log.info("[change-password] ✅ Password updated for user %s", session["user_id"])
    except PocketBaseError as e:
        log.error("[change-password] PB error: %s", e.message)
        return api_error(e)

    return jsonify({
        "ok": True,
        "message": "Password berhasil diubah",
    })
# --------------------------------------------------------------------- #
# Auth — Delete Account
# --------------------------------------------------------------------- #
@app.post("/api/auth/delete-account")
@login_required
def api_delete_account():
    """Hapus akun user + semua data terkait."""
    user_id = session["user_id"]

    try:
        admin_token = _pb_admin_login()
        pb_url = os.getenv("PB_URL", "").rstrip("/")
    except Exception as e:
        log.exception("[delete-account] Admin login fail")
        return jsonify({"error": "Server error"}), 500

    # Delete child collections
    collections = ["service_records", "fuel_logs", "documents", "reminders", "vehicles"]
    deleted_count = 0

    for coll in collections:
        try:
            r = requests.get(
                f"{pb_url}/api/collections/{coll}/records",
                headers={"Authorization": f"Bearer {admin_token}"},
                params={"filter": f'owner="{user_id}"', "perPage": 500},
                timeout=15,
            )
            r.raise_for_status()
            for item in r.json().get("items", []):
                requests.delete(
                    f"{pb_url}/api/collections/{coll}/records/{item['id']}",
                    headers={"Authorization": f"Bearer {admin_token}"},
                    timeout=15,
                )
                deleted_count += 1
        except Exception as e:
            log.warning("[delete-account] Gagal hapus %s: %s", coll, e)

    # Delete user
    try:
        r = requests.delete(
            f"{pb_url}/api/collections/users/records/{user_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=15,
        )
        r.raise_for_status()
    except Exception as e:
        log.exception("[delete-account] Gagal hapus user")
        return jsonify({"error": "Gagal hapus akun"}), 500

    log.info("[delete-account] ✅ User %s deleted (+%d records)", user_id, deleted_count)

    session.clear()
    return jsonify({
        "ok": True,
        "message": "Akun berhasil dihapus",
        "deleted_records": deleted_count,
    })


# --------------------------------------------------------------------- #
# Auth — Registrasi via Telegram Bot
# --------------------------------------------------------------------- #
@app.post("/api/auth/register-via-telegram")
def api_register_via_telegram():
    """Registrasi user baru via bot Telegram."""
    data = request.get_json(force=True) or {}

    # STEP 1: Verify HMAC
    is_valid, err_msg = verify_bot_signature(data)
    if not is_valid:
        log.warning("[register] ❌ HMAC fail: %s (IP: %s)",
                    err_msg, request.remote_addr)
        return jsonify({"error": "Unauthorized"}), 401

    # STEP 2: Rate limit
    tg_id = str(data.get("telegram_id", "")).strip()
    ip = request.remote_addr or "unknown"

    if not tg_id:
        return jsonify({"error": "telegram_id tidak valid"}), 400

    if not check_rate_limit(f"reg_tg:{tg_id}", max_requests=3, window_sec=3600):
        log.warning("[register] ⚠️ Rate limited tg_id=%s", tg_id)
        _log_registration({
            "telegram_id": tg_id,
            "telegram_username": data.get("telegram_username", ""),
            "action": "fail_rate_limit",
            "ip_address": ip,
            "user_agent": request.headers.get("User-Agent", "")[:500],
            "success": False,
            "error_message": "Rate limit exceeded (tg_id)",
        })
        return jsonify({
            "error": "Terlalu banyak percobaan registrasi. Coba lagi 1 jam lagi."
        }), 429

    if not check_rate_limit(f"reg_ip:{ip}", max_requests=10, window_sec=3600):
        log.warning("[register] ⚠️ Rate limited IP=%s", ip)
        _log_registration({
            "telegram_id": tg_id,
            "action": "fail_rate_limit",
            "ip_address": ip,
            "user_agent": request.headers.get("User-Agent", "")[:500],
            "success": False,
            "error_message": "Rate limit exceeded (IP)",
        })
        return jsonify({
            "error": "Terlalu banyak percobaan dari IP ini. Coba lagi nanti."
        }), 429

    # STEP 3: Validate input
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    tg_username = (data.get("telegram_username") or "").strip()

    if not name or len(name) < 2:
        return jsonify({"error": "Nama minimal 2 karakter"}), 400
    if len(name) > 50:
        return jsonify({"error": "Nama maksimal 50 karakter"}), 400
    if not re.match(r"^[a-zA-Z0-9\s\.\'-]+$", name):
        return jsonify({"error": "Nama hanya boleh huruf, angka, spasi"}), 400

    if email:
        if len(email) > 254:
            return jsonify({"error": "Email terlalu panjang"}), 400
        if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
            return jsonify({"error": "Format email tidak valid"}), 400

    # STEP 4: Check duplicate
    try:
        admin_token = _pb_admin_login()
    except Exception as e:
        log.exception("[register] Admin login fail")
        return jsonify({"error": "Server error. Coba lagi nanti."}), 500

    existing_tg = _pb_find_user_by_telegram_id(admin_token, tg_id)
    if existing_tg:
        log.info("[register] tg_id=%s already registered", tg_id)
        return jsonify({
            "error": "Akun Telegram Anda sudah terdaftar",
            "action": "login",
            "user_id": existing_tg.get("id"),
        }), 409

    if email:
        existing_email = _pb_find_user_by_email(admin_token, email)
        if existing_email:
            log.info("[register] email=%s already registered", email)
            return jsonify({
                "error": "Registrasi gagal. Coba dengan email lain atau login."
            }), 409

    # STEP 5: Generate password
    password = _generate_secure_password(length=16)

    # STEP 6: Create user
    pb_url = os.getenv("PB_URL", "").rstrip("/")
    final_email = email or f"tg_{tg_id}@telegram.local"

    user_payload = {
        "email": final_email,
        "password": password,
        "passwordConfirm": password,
        "name": name,
        "emailVisibility": False,
        "telegram_id": tg_id,
        "telegram_username": tg_username,
        "telegram_linked_at": datetime.now(timezone.utc).isoformat(),
        "registered_via": "telegram",
        "registered_at": datetime.now(timezone.utc).isoformat(),
        "registered_from_ip": ip,
        "is_verified": True,
        "verified": True,
        "password_set": False,
        "password_temporary": True,
    }

    try:
        r = requests.post(
            f"{pb_url}/api/collections/users/records",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=user_payload,
            timeout=20,
        )
        r.raise_for_status()
        user = r.json()
    except requests.HTTPError as e:
        log.error("[register] PB create user error: %s", e)
        try:
            err_data = r.json()
        except Exception:
            err_data = {}
        return jsonify({
            "error": err_data.get("message", "Gagal membuat akun di server")
        }), 500
    except Exception as e:
        log.exception("[register] Gagal create user")
        return jsonify({"error": "Server error. Coba lagi nanti."}), 500

    # STEP 7: Audit log
    _log_registration({
        "telegram_id": tg_id,
        "telegram_username": tg_username,
        "action": "register",
        "ip_address": ip,
        "user_agent": request.headers.get("User-Agent", "")[:500],
        "success": True,
        "metadata": {
            "user_id": user["id"],
            "email": final_email,
            "name": name,
            "via": "telegram",
        },
    })

    log.info("[register] ✅ New user: id=%s, tg_id=%s, name=%s",
             user["id"], tg_id, name)

    return jsonify({
        "user_id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "password": password,
        "must_change_password": True,
        "message": "Akun berhasil dibuat",
    })


# --------------------------------------------------------------------- #
# Telegram Mini App — Auto login
# --------------------------------------------------------------------- #
@app.post("/api/auth/telegram")
def api_auth_telegram():
    """Auto-login via Telegram Mini App."""
    data = request.get_json(force=True) or {}
    init_data = data.get("initData") or request.headers.get("X-Telegram-Init-Data", "")

    if not init_data:
        log.warning("[tg-auth] initData kosong")
        return jsonify({"error": "initData tidak ditemukan"}), 400

    tg_user = verify_telegram_init_data(init_data)
    if not tg_user:
        return jsonify({"error": "initData tidak valid atau kadaluarsa"}), 401

    tg_id = str(tg_user.get("id") or "")
    if not tg_id:
        return jsonify({"error": "user.id tidak ditemukan di initData"}), 400

    log.info("[tg-auth] initData valid untuk tg_id=%s (@%s)",
             tg_id, tg_user.get("username", "?"))

    pb_url = os.getenv("PB_URL", "").rstrip("/")
    admin_email = os.getenv("PB_ADMIN_EMAIL", "")
    admin_pwd = os.getenv("PB_ADMIN_PASSWORD", "")

    if not all([pb_url, admin_email, admin_pwd]):
        return jsonify({"error": "Konfigurasi admin PocketBase tidak lengkap"}), 500

    try:
        r = requests.post(
            f"{pb_url}/api/collections/_superusers/auth-with-password",
            json={"identity": admin_email, "password": admin_pwd},
            timeout=15,
        )
        r.raise_for_status()
        admin_token = r.json()["token"]
    except (requests.RequestException, KeyError) as e:
        log.error("[tg-auth] admin login gagal: %s", e)
        return jsonify({"error": f"Admin login gagal: {e}"}), 500

    try:
        r = requests.get(
            f"{pb_url}/api/collections/users/records",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"filter": f'telegram_id="{tg_id}"', "perPage": 1},
            timeout=15,
        )
        r.raise_for_status()
        users = r.json().get("items", [])
    except (requests.RequestException, KeyError) as e:
        log.error("[tg-auth] gagal cari user: %s", e)
        return jsonify({"error": f"Gagal mencari user: {e}"}), 500

    if not users:
        log.info("[tg-auth] user dengan tg_id=%s tidak ditemukan", tg_id)
        return jsonify({
            "error": "Akun Telegram belum ter-link dengan Vehicle Tracker.",
            "need_link": True,
        }), 404

    user = users[0]

    session["user_id"] = user["id"]
    session["user_email"] = user.get("email", "")
    session["user_name"] = user.get("name", "")
    session["pb_token"] = admin_token
    session["is_mini_app"] = True
    session.permanent = True

    log.info(
        "[tg-auth] session set: user_id=%s tg_id=%s",
        user["id"], tg_id,
    )

    return jsonify({
        "user": {
            "id": user["id"],
            "email": user.get("email", ""),
            "name": user.get("name", ""),
        }
    })


# --------------------------------------------------------------------- #
# Telegram Linking API (web-side)
# --------------------------------------------------------------------- #
@app.post("/api/telegram/generate-token")
@login_required
def telegram_generate_token():
    bot_username = os.getenv("TELEGRAM_BOT_USERNAME", "").lstrip("@")
    if not bot_username:
        return jsonify({"error": "TELEGRAM_BOT_USERNAME belum di-set di server"}), 500

    token = _make_link_token()
    client = get_client()
    try:
        client.update_record("users", session["user_id"], {
            "telegram_link_token": token,
        })
    except PocketBaseError as e:
        return api_error(e)

    ts = int(token.split(".", 1)[0])

    return jsonify({
        "token": token,
        "bot_username": bot_username,
        "bot_url": f"https://t.me/{bot_username}",
        "expires_at": ts + TOKEN_MAX_AGE_SEC,
        "expires_in_seconds": TOKEN_MAX_AGE_SEC,
        "expires_in_minutes": TOKEN_MAX_AGE_SEC // 60,
    })


@app.post("/api/telegram/unlink")
@login_required
def telegram_unlink():
    client = get_client()
    try:
        client.update_record("users", session["user_id"], {
            "telegram_id": "",
            "telegram_username": "",
            "telegram_link_token": "",
            "telegram_linked_at": "",
        })
    except PocketBaseError as e:
        return api_error(e)
    return jsonify({"ok": True})


@app.post("/api/telegram/clear-token")
@login_required
def telegram_clear_token():
    client = get_client()
    try:
        client.update_record("users", session["user_id"], {
            "telegram_link_token": "",
        })
    except PocketBaseError as e:
        return api_error(e)
    return jsonify({"ok": True})


# --------------------------------------------------------------------- #
# Vehicles API
# --------------------------------------------------------------------- #
@app.get("/api/vehicles")
@login_required
def list_vehicles():
    client = get_client()
    try:
        res = client.list_records(
            "vehicles",
            filter=f'owner="{session["user_id"]}"',
            sort="-created",
            perPage=100,
        )
    except PocketBaseError as e:
        return api_error(e)
    return jsonify(res)


@app.get("/api/vehicles/<vid>")
@login_required
def get_vehicle(vid):
    client = get_client()
    try:
        record = client.get_record("vehicles", vid)
    except PocketBaseError as e:
        return api_error(e)
    if record.get("owner") != session["user_id"]:
        return jsonify({"error": "Not found"}), 404
    return jsonify(record)


@app.post("/api/vehicles")
@login_required
def create_vehicle():
    data, files = extract_payload()
    data["owner"] = session["user_id"]

    try:
        _validate_numbers(data, "vehicles")
    except PocketBaseError as e:
        return api_error(e)

    client = get_client()
    try:
        record = client.create_record("vehicles", data, files)
    except PocketBaseError as e:
        return api_error(e)
    return jsonify(record), 201


@app.patch("/api/vehicles/<vid>")
@login_required
def update_vehicle(vid):
    data, files = extract_payload()
    data.pop("owner", None)

    try:
        _validate_numbers(data, "vehicles")
    except PocketBaseError as e:
        return api_error(e)

    client = get_client()
    try:
        record = client.update_record("vehicles", vid, data, files)
    except PocketBaseError as e:
        return api_error(e)
    return jsonify(record)


@app.delete("/api/vehicles/<vid>")
@login_required
def delete_vehicle(vid):
    client = get_client()
    try:
        client.delete_record("vehicles", vid)
    except PocketBaseError as e:
        return api_error(e)
    return jsonify({"ok": True})


# --------------------------------------------------------------------- #
# Generic child collections
# --------------------------------------------------------------------- #
@app.get("/api/records/<collection>")
@login_required
def proxy_list(collection):
    if collection not in ALLOWED_CHILD_COLLECTIONS:
        return jsonify({"error": "Collection tidak valid"}), 400

    filter_q = request.args.get("filter", "")
    sort_q = request.args.get("sort", "-created")
    expand_q = request.args.get("expand", "")
    try:
        per_page = int(request.args.get("perPage", 100))
    except (TypeError, ValueError):
        per_page = 100

    base_filter = f'owner="{session["user_id"]}"'
    combined = f'({base_filter}) && ({filter_q})' if filter_q else base_filter

    params = {"filter": combined, "sort": sort_q, "perPage": per_page}
    if expand_q:
        params["expand"] = expand_q

    client = get_client()
    try:
        res = client.list_records(collection, **params)
    except PocketBaseError as e:
        return api_error(e)
    return jsonify(res)


@app.post("/api/records/<collection>")
@login_required
def proxy_create(collection):
    if collection not in ALLOWED_CHILD_COLLECTIONS:
        return jsonify({"error": "Collection tidak valid"}), 400

    data, files = extract_payload()
    data["owner"] = session["user_id"]

    try:
        _validate_numbers(data, collection)
    except PocketBaseError as e:
        return api_error(e)

    client = get_client()
    try:
        if collection == "service_records":
            record = _handle_service_create(client, data, files)
        elif collection == "fuel_logs":
            record = _handle_fuel_create(client, data, files)
        else:
            record = client.create_record(collection, data, files)
    except PocketBaseError as e:
        return api_error(e)

    return jsonify(record), 201


@app.patch("/api/records/<collection>/<rid>")
@login_required
def proxy_update(collection, rid):
    if collection not in ALLOWED_CHILD_COLLECTIONS:
        return jsonify({"error": "Collection tidak valid"}), 400

    data, files = extract_payload()
    data.pop("owner", None)

    try:
        _validate_numbers(data, collection)
    except PocketBaseError as e:
        return api_error(e)

    client = get_client()
    try:
        if collection == "service_records":
            record = client.update_record(collection, rid, data, files)
            _maybe_update_vehicle_odometer(
                client, record.get("vehicle"), record.get("odometer")
            )
        elif collection == "fuel_logs":
            record = _handle_fuel_update(client, rid, data, files)
        else:
            record = client.update_record(collection, rid, data, files)
    except PocketBaseError as e:
        return api_error(e)
    return jsonify(record)


@app.delete("/api/records/<collection>/<rid>")
@login_required
def proxy_delete(collection, rid):
    if collection not in ALLOWED_CHILD_COLLECTIONS:
        return jsonify({"error": "Collection tidak valid"}), 400

    client = get_client()
    try:
        client.delete_record(collection, rid)
    except PocketBaseError as e:
        return api_error(e)
    return jsonify({"ok": True})


# --------------------------------------------------------------------- #
# File Proxy
# --------------------------------------------------------------------- #
@app.get("/api/files/<collection>/<rid>/<path:filename>")
@login_required
def proxy_file(collection, rid, filename):
    allowed = ALLOWED_CHILD_COLLECTIONS | {"vehicles"}
    if collection not in allowed:
        return jsonify({"error": "Collection tidak valid"}), 400

    client = get_client()

    try:
        record = client.get_record(collection, rid)
    except PocketBaseError as e:
        return api_error(e)

    if record.get("owner") != session["user_id"]:
        return jsonify({"error": "Not found"}), 404

    pb_url = os.getenv("PB_URL", "").rstrip("/")
    file_url = f"{pb_url}/api/files/{collection}/{rid}/{filename}"
    headers = {"Authorization": f"Bearer {session['pb_token']}"}

    try:
        r = requests.get(file_url, headers=headers, stream=True, timeout=30)
    except requests.RequestException as e:
        return jsonify({"error": f"Gagal ambil file: {e}"}), 502

    if r.status_code != 200:
        return jsonify({"error": "File tidak ditemukan"}), r.status_code

    def generate():
        for chunk in r.iter_content(chunk_size=8192):
            if chunk:
                yield chunk

    resp = Response(
        stream_with_context(generate()),
        status=200,
        content_type=r.headers.get("Content-Type", "application/octet-stream"),
    )
    resp.headers["Cache-Control"] = "private, max-age=3600"
    resp.headers["Content-Disposition"] = "inline"
    return resp


# --------------------------------------------------------------------- #
# Business logic helpers
# --------------------------------------------------------------------- #
def _maybe_update_vehicle_odometer(client: PocketBaseClient, vehicle_id, odo):
    """Update vehicles.odometer_terakhir kalau odo > nilai saat ini."""
    if not vehicle_id or odo is None:
        return
    try:
        odo = float(odo)
    except (TypeError, ValueError):
        return

    try:
        vehicle = client.get_record("vehicles", vehicle_id)
    except PocketBaseError:
        return

    current = vehicle.get("odometer_terakhir") or 0
    if odo > current:
        try:
            client.update_record("vehicles", vehicle_id, {"odometer_terakhir": odo})
        except PocketBaseError:
            pass


def _handle_service_create(client: PocketBaseClient, data: dict, files):
    record = client.create_record("service_records", data, files)
    _maybe_update_vehicle_odometer(
        client, record.get("vehicle"), record.get("odometer")
    )
    return record


def _compute_fuel_consumption(client, vehicle_id, current_odo, current_liter, full_tank):
    """Hitung km/L dari full-tank sebelumnya."""
    if not full_tank or not current_liter:
        return None
    try:
        current_odo = float(current_odo)
        current_liter = float(current_liter)
    except (TypeError, ValueError):
        return None
    if current_liter <= 0:
        return None

    try:
        res = client.list_records(
            "fuel_logs",
            filter=f'vehicle="{vehicle_id}" && full_tank=true && odometer<{current_odo}',
            sort="-odometer",
            perPage=1,
        )
    except PocketBaseError:
        return None

    items = res.get("items", [])
    if not items:
        return None

    prev_odo = float(items[0].get("odometer") or 0)
    distance = current_odo - prev_odo
    if distance <= 0:
        return None
    return round(distance / current_liter, 2)


def _handle_fuel_create(client: PocketBaseClient, data: dict, files):
    vehicle_id = data.get("vehicle")
    odo = data.get("odometer")

    try:
        vehicle = client.get_record("vehicles", vehicle_id)
        odo_f = float(odo)
        last_odo = float(vehicle.get("odometer_terakhir") or 0)
        if odo_f < last_odo:
            raise PocketBaseError(
                f"Odometer ({odo_f:.0f}) tidak boleh kurang dari odometer "
                f"terakhir kendaraan ({last_odo:.0f}).",
                400,
            )
    except PocketBaseError:
        raise
    except (TypeError, ValueError):
        pass

    full_tank = data.get("full_tank") in (True, "true", "True", "1", 1)
    konsumsi = _compute_fuel_consumption(
        client, vehicle_id, odo, data.get("liter"), full_tank
    )
    if konsumsi is not None:
        data["konsumsi"] = konsumsi

    record = client.create_record("fuel_logs", data, files)
    _maybe_update_vehicle_odometer(client, vehicle_id, odo)
    return record


def _handle_fuel_update(client: PocketBaseClient, rid: str, data: dict, files):
    existing = client.get_record("fuel_logs", rid)
    merged = {**existing, **data}

    vehicle_id = merged.get("vehicle")
    odo = merged.get("odometer")
    liter = merged.get("liter")
    full_tank = merged.get("full_tank") in (True, "true", "True", "1", 1)

    konsumsi = _compute_fuel_consumption(client, vehicle_id, odo, liter, full_tank)
    data["konsumsi"] = konsumsi if konsumsi is not None else 0

    record = client.update_record("fuel_logs", rid, data, files)
    _maybe_update_vehicle_odometer(client, vehicle_id, odo)
    return record


# --------------------------------------------------------------------- #
# JSON error handlers
# --------------------------------------------------------------------- #
@app.errorhandler(400)
@app.errorhandler(401)
@app.errorhandler(403)
@app.errorhandler(404)
@app.errorhandler(405)
@app.errorhandler(500)
def handle_http_error(e):
    if request.path.startswith("/api/"):
        return jsonify({
            "error": getattr(e, "description", None) or getattr(e, "name", "Error"),
            "code": getattr(e, "code", 500),
        }), getattr(e, "code", 500)
    return e


# --------------------------------------------------------------------- #
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "0") == "1"

    log.info("🚀 Vehicle Tracker — http://0.0.0.0:%d", port)
    log.info("   PB_URL: %s", os.getenv("PB_URL", "—"))
    log.info("   SESSION_COOKIE_SAMESITE: %s", app.config["SESSION_COOKIE_SAMESITE"])
    log.info("   SESSION_COOKIE_SECURE:   %s", app.config["SESSION_COOKIE_SECURE"])
    log.info("   BOT_API_KEY: %s",
             "✓ set" if BOT_API_KEY else "✗ NOT SET")
    log.info("   PASSWORD_MIN_LENGTH: %d", PASSWORD_MIN_LENGTH)

    app.run(host="0.0.0.0", port=port, debug=debug)