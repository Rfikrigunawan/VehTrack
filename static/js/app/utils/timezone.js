/* =====================================================================
   utils/timezone.js — WIB (GMT+7) Helpers
   =====================================================================
   Fungsi:
     Semua konversi waktu antara UTC (PocketBase) dan WIB (user).

   Konstanta:
     - WIB_OFFSET_MIN = 7 * 60 (menit)
     - MONTH_ID = ['Jan', 'Feb', ...]

   API:
     - fmtDate(utcIso)      → '22 Sep 2026 14:30' (WIB)
     - todayISO()           → '2026-09-22'
     - nowWIB()             → '2026-09-22 14:30'
     - todayWIBMidnight()   → '2026-09-22 00:00'
     - toPBDate(wibStr)     → UTC ISO untuk PocketBase
     - fromPBDate(utcIso)   → 'YYYY-MM-DD HH:MM' WIB
     - daysUntil(dateStr)   → selisih hari

   Depends:
     - utils/icons.js
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;

const WIB_OFFSET_MIN = 7 * 60;
const MONTH_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];

/**
 * Format UTC ISO dari PocketBase → "22 Sep 2026" atau "22 Sep 2026 14:30" (WIB).
 * Kalau jam WIB = 00:00 → tampilkan tanggal saja.
 */
function fmtDate(s) {
  if (!s) return '-';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '-';

  const wibMs = d.getTime() + WIB_OFFSET_MIN * 60 * 1000;
  const wib = new Date(wibMs);

  const dd = String(wib.getUTCDate()).padStart(2, '0');
  const mm = MONTH_ID[wib.getUTCMonth()];
  const yyyy = wib.getUTCFullYear();
  const datePart = `${dd} ${mm} ${yyyy}`;

  const hh = wib.getUTCHours();
  const mi = wib.getUTCMinutes();

  if (hh === 0 && mi === 0) return datePart;

  const hhStr = String(hh).padStart(2, '0');
  const miStr = String(mi).padStart(2, '0');
  return `${datePart} ${hhStr}:${miStr}`;
}

/** Tanggal hari ini dalam WIB → "YYYY-MM-DD" */
function todayISO() {
  const now = new Date();
  const wib = new Date(now.getTime() + WIB_OFFSET_MIN * 60 * 1000);
  const Y = wib.getUTCFullYear();
  const M = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const D = String(wib.getUTCDate()).padStart(2, '0');
  return `${Y}-${M}-${D}`;
}

/** Sekarang dalam WIB → "YYYY-MM-DD HH:MM" */
function nowWIB() {
  const now = new Date();
  const wib = new Date(now.getTime() + WIB_OFFSET_MIN * 60 * 1000);
  const Y = wib.getUTCFullYear();
  const M = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const D = String(wib.getUTCDate()).padStart(2, '0');
  const H = String(wib.getUTCHours()).padStart(2, '0');
  const Mi = String(wib.getUTCMinutes()).padStart(2, '0');
  return `${Y}-${M}-${D} ${H}:${Mi}`;
}

/** Tanggal hari ini WIB + 00:00 → "YYYY-MM-DD 00:00" */
function todayWIBMidnight() {
  return `${todayISO()} 00:00`;
}

/**
 * WIB datetime string "YYYY-MM-DD HH:MM" → UTC ISO untuk PocketBase.
 */
function toPBDate(s) {
  if (!s) return '';
  const m = String(s).trim().match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s]+(\d{1,2}):(\d{2}))?/
  );
  if (!m) return '';
  const [, y, mo, d, h = '0', mi = '0'] = m;
  const utcMs = Date.UTC(
    Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), 0
  ) - WIB_OFFSET_MIN * 60 * 1000;
  const utc = new Date(utcMs);
  const Y = utc.getUTCFullYear();
  const M = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const D = String(utc.getUTCDate()).padStart(2, '0');
  const H = String(utc.getUTCHours()).padStart(2, '0');
  const Mi = String(utc.getUTCMinutes()).padStart(2, '0');
  return `${Y}-${M}-${D} ${H}:${Mi}:00.000Z`;
}

/** UTC ISO dari PocketBase → WIB datetime "YYYY-MM-DD HH:MM" */
function fromPBDate(s) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';

  const wibMs = d.getTime() + WIB_OFFSET_MIN * 60 * 1000;
  const wib = new Date(wibMs);
  const Y = wib.getUTCFullYear();
  const M = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const D = String(wib.getUTCDate()).padStart(2, '0');
  const H = String(wib.getUTCHours()).padStart(2, '0');
  const Mi = String(wib.getUTCMinutes()).padStart(2, '0');
  return `${Y}-${M}-${D} ${H}:${Mi}`;
}

// Alias lama
const toPBDateTime = toPBDate;
const fromPBDateTime = fromPBDate;

/**
 * Selisih hari antara hari ini (WIB) dan target date.
 * Return: integer (bisa negatif kalau sudah lewat).
 */
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const t = new Date(dateStr);
  if (isNaN(t.getTime())) return null;
  const wib = new Date(t.getTime() + WIB_OFFSET_MIN * 60 * 1000);
  const targetMid = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate());
  const now = new Date();
  const nowWib = new Date(now.getTime() + WIB_OFFSET_MIN * 60 * 1000);
  const todayMid = Date.UTC(nowWib.getUTCFullYear(), nowWib.getUTCMonth(), nowWib.getUTCDate());
  return Math.round((targetMid - todayMid) / 86400000);
}

Object.assign(VT, {
  WIB_OFFSET_MIN,
  MONTH_ID,
  fmtDate,
  todayISO,
  nowWIB,
  todayWIBMidnight,
  toPBDate,
  fromPBDate,
  toPBDateTime,
  fromPBDateTime,
  daysUntil,
});

})();