/* =====================================================================
   Vehicle Tracker — Telegram Mini App Bootstrap
   =====================================================================
   Tugas:
     1. Detect Telegram WebApp
     2. Set theme dari Telegram (light/dark + colors)
     3. Auto-login via initData
     4. Init app.content.js (skip auto-init karena VT_MINI_APP_MODE)
     5. Setup haptic feedback + safe area
     6. Handle error dengan UI yang menarik

   Bergantung pada:
     - Telegram WebApp SDK (telegram-web-app.js)
     - window.__vt_init() dari js/app/main.js

   Load order di HTML:
     ... semua modul app ...
     <script src="js/app/main.js" defer></script>
     <script src="teleapp.script.js" defer></script>
   ===================================================================== */

(function () {
'use strict';

const $ = (s) => document.querySelector(s);

/* =====================================================================
   0. TELEGRAM SDK
   ===================================================================== */
const tg = window.Telegram?.WebApp;

if (!tg) {
  showError(
    'Hanya via Telegram',
    'Mini App ini hanya bisa dibuka dari dalam aplikasi Telegram.\n\n' +
    'Buka bot Anda lalu ketuk menu "Buka App".',
    { type: 'info', icon: '📱' }
  );
  return;
}

// Expand fullscreen & disable vertical swipes (Bot API 7.7+)
try {
  tg.ready();
  tg.expand();
  if (typeof tg.disableVerticalSwipes === 'function') {
    tg.disableVerticalSwipes();
  }
} catch (e) {
  console.warn('[tg] expand/ready error:', e);
}

/* =====================================================================
   1. THEME SYNC — Dark/Light dari Telegram
   ===================================================================== */
function applyTelegramTheme() {
  const scheme = tg.colorScheme;         // 'light' | 'dark'
  const params = tg.themeParams || {};
  const html = document.documentElement;

  // Set Bootstrap theme
  html.setAttribute('data-bs-theme', scheme === 'light' ? 'light' : 'dark');

  // Override CSS variables dari Telegram theme
  const root = html.style;
  if (params.bg_color) {
    root.setProperty('--c-bg', params.bg_color);
  }
  if (params.secondary_bg_color) {
    root.setProperty('--c-surface-solid', params.secondary_bg_color);
  }
  if (params.text_color) {
    root.setProperty('--c-text', params.text_color);
  }
  if (params.hint_color) {
    root.setProperty('--c-text-soft', params.hint_color);
  }
  if (params.button_color) {
    root.setProperty('--c-primary', params.button_color);
  }
  if (params.button_text_color) {
    root.setProperty('--c-primary-text', params.button_text_color);
  }
  if (params.link_color) {
    root.setProperty('--c-primary-hover', params.link_color);
  }

  // Update meta theme-color untuk status bar Telegram
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && params.bg_color) {
    meta.setAttribute('content', params.bg_color);
  }

  console.log('[tg] theme applied:', scheme);
}

applyTelegramTheme();

// Listen theme change
if (tg.onEvent) {
  tg.onEvent('themeChanged', () => {
    applyTelegramTheme();
    haptic('soft');
  });
}

/* =====================================================================
   2. HAPTIC FEEDBACK
   ===================================================================== */
function haptic(type = 'light') {
  const h = tg.HapticFeedback;
  if (!h) return;
  try {
    if (type === 'selection' && h.selectionChanged) {
      h.selectionChanged();
    } else if (h.impactOccurred) {
      h.impactOccurred(type);
    }
  } catch (e) {
    /* silent */
  }
}

// Global haptic on button click (delegation + capture phase)
document.addEventListener('click', (e) => {
  const btn = e.target.closest(
    'button, .btn, .sidebar-item, .dash-vehicle-card, ' +
    '.card-clickable, .sidebar-user-action, .tg-error-btn'
  );
  if (btn && !btn.disabled) haptic('light');
}, true);

// Expose ke window
window.__tgHaptic = haptic;

/* =====================================================================
   3. LOADING / ERROR UI
   ===================================================================== */
const loadingEl = $('#tg-loading');
const errorEl = $('#tg-error');
const appEl = $('#tg-app');

function showLoading(text = 'Menghubungkan ke Telegram…') {
  const textEl = loadingEl?.querySelector('.tg-loading-text');
  if (textEl) textEl.textContent = text;
  loadingEl?.classList.remove('hidden');
  errorEl?.classList.add('hidden');
  appEl?.classList.add('hidden');
}

function hideLoading() {
  loadingEl?.classList.add('hidden');
}

/**
 * Tampilkan error screen
 * @param {string} title - Judul error
 * @param {string} text  - Deskripsi (bisa pakai \n, <code>)
 * @param {object} opts  - { type: 'danger'|'warning'|'info', icon: '📱' }
 */
function showError(title, text, opts = {}) {
  const { type = 'danger', icon = null } = opts;

  loadingEl?.classList.add('hidden');
  errorEl?.classList.remove('hidden');
  appEl?.classList.add('hidden');

  if (!errorEl) return;

  // Set variant
  errorEl.setAttribute('data-type', type);

  const titleEl = $('#tg-error-title');
  const textEl = $('#tg-error-text');
  if (titleEl) titleEl.textContent = title;
  if (textEl) textEl.innerHTML = text;

  // Override icon (emoji di .tg-error-icon)
  if (icon) {
    const iconEl = errorEl.querySelector('.tg-error-icon');
    if (iconEl) iconEl.textContent = icon;
  }
}

function showApp() {
  loadingEl?.classList.add('hidden');
  errorEl?.classList.add('hidden');
  appEl?.classList.remove('hidden');
}

// Bind error buttons
$('#tg-error-retry')?.addEventListener('click', () => {
  haptic('medium');
  location.reload();
});

$('#tg-error-close')?.addEventListener('click', () => {
  haptic('soft');
  if (tg.close) tg.close();
});

/* =====================================================================
   4. AUTO-LOGIN VIA INIT DATA
   ===================================================================== */
async function autoLogin(initData) {
  try {
    const res = await fetch('/api/auth/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData }),
      credentials: 'same-origin',
    });

    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      /* silent */
    }

    if (!res.ok) {
      return {
        ok: false,
        error: data.error || `HTTP ${res.status}`,
        needLink: data.need_link === true,
      };
    }

    if (!data.user) {
      return { ok: false, error: 'Response tidak valid' };
    }

    // Verify cookie benar-benar tersimpan
    // (mendeteksi masalah SESSION_COOKIE_SAMESITE=None + SECURE)
    try {
      const verify = await fetch('/api/auth/me', {
        credentials: 'same-origin',
      });

      if (!verify.ok) {
        console.warn('[tg] cookie tidak tersimpan, verifikasi gagal:', verify.status);
        return {
          ok: false,
          error:
            'Cookie session tidak tersimpan.\n\n' +
            'Cek konfigurasi SESSION_COOKIE_SAMESITE=None dan ' +
            'SESSION_COOKIE_SECURE=1 di server.',
        };
      }

      console.log('[tg] session verified via /api/auth/me');
    } catch (e) {
      console.warn('[tg] verify error:', e);
      // Lanjut saja — mungkin tidak fatal
    }

    return { ok: true, user: data.user };
  } catch (e) {
    return { ok: false, error: e.message || 'Network error' };
  }
}

/* =====================================================================
   5. BOOTSTRAP
   ===================================================================== */
(async function bootstrap() {
  showLoading('Memverifikasi akun Telegram…');

  // Validasi initData ada
  if (!tg.initData) {
    showError(
      'Session tidak valid',
      'Data autentikasi Telegram tidak tersedia.\n\n' +
      'Coba tutup dan buka ulang Mini App.',
      { type: 'warning', icon: '🔐' }
    );
    return;
  }

  // Auto-login
  const result = await autoLogin(tg.initData);

  if (!result.ok) {
    if (result.needLink) {
      showError(
        'Akun belum ter-link',
        'Akun Telegram Anda belum terhubung dengan Vehicle Tracker.\n\n' +
        'Cara link:\n' +
        '1. Buka web Vehicle Tracker di browser\n' +
        '2. Login → Pengaturan → Link Telegram\n' +
        '3. Copy token, kirim ke bot:\n' +
        '<code>/link &lt;token&gt;</code>\n' +
        '4. Balik ke sini, tekan Coba Lagi',
        { type: 'info', icon: '🔗' }
      );
    } else if (result.error?.includes('Cookie')) {
      // Konfigurasi server salah
      showError(
        'Konfigurasi server salah',
        result.error,
        { type: 'danger', icon: '⚙️' }
      );
    } else {
      showError(
        'Gagal login',
        result.error || 'Terjadi kesalahan tidak diketahui.',
        { type: 'danger', icon: '⚠️' }
      );
    }
    return;
  }

  console.log('[tg] login ok:', result.user);

  // Update user info di sidebar
  const avatarEl = $('#tg-user-avatar');
  const nameEl = $('#tg-user-name');
  const emailEl = $('#tg-user-email');

  const displayName = result.user.name || result.user.email || '?';
  if (avatarEl) avatarEl.textContent = displayName[0].toUpperCase();
  if (nameEl) nameEl.textContent = result.user.name || 'User';
  if (emailEl) emailEl.textContent = result.user.email || '-';

  // ====================================================================
  // ✅ Init app — pakai window.__vt_init dari js/app/main.js
  // ====================================================================
  showLoading('Memuat data…');

  if (typeof window.__vt_init !== 'function') {
    showError(
      'Modul tidak dimuat',
      'Aplikasi belum siap. Coba refresh Mini App.\n\n' +
      'Jika masalah berlanjut, hubungi admin bot.',
      { type: 'danger', icon: '📦' }
    );
    console.error('[tg] window.__vt_init tidak ditemukan — cek load order script!');
    return;
  }

  try {
    await window.__vt_init();
  } catch (e) {
    console.error('[tg] init error:', e);
    showError(
      'Gagal inisialisasi',
      e.message || 'Terjadi kesalahan saat memuat aplikasi.',
      { type: 'danger', icon: '💥' }
    );
    return;
  }

  // Show app
  showApp();

  // Trigger resize untuk render ulang
  setTimeout(() => window.dispatchEvent(new Event('resize')), 100);

  // Haptic sukses
  haptic('soft');

  console.log('[tg] app ready');
})();

/* =====================================================================
   6. SAFE AREA / VIEWPORT HANDLING
   ===================================================================== */
function setViewportHeight() {
  if (!tg.viewportStableHeight) return;
  document.documentElement.style.setProperty(
    '--tg-viewport-height',
    `${tg.viewportStableHeight}px`
  );
}

setViewportHeight();

if (tg.onEvent) {
  tg.onEvent('viewportChanged', setViewportHeight);
}

/* =====================================================================
   7. OVERRIDE LOGOUT → TUTUP MINI APP
   ===================================================================== */
$('#tg-close-sidebar')?.addEventListener('click', () => {
  haptic('soft');
  if (tg.close) tg.close();
});

$('#btn-logout-tg')?.addEventListener('click', () => {
  haptic('medium');
  if (confirm('Tutup Mini App?')) {
    if (tg.close) tg.close();
  }
});

// Expose helper untuk dipakai app.content.js / js/app/layout/header.js
window.__tgClose = () => {
  if (tg.close) tg.close();
  else window.location.href = '/';
};

/* =====================================================================
   8. PREVENT PULL-TO-REFRESH BAWAAN
   ===================================================================== */
let _touchStartY = 0;

document.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) {
    _touchStartY = e.touches[0].clientY;
  }
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  // Hanya prevent di luar area scroll yang "sah"
  const scrollable = e.target.closest(
    '#content, .modal-body, .sidebar-nav, .flatpickr-calendar, .app-content'
  );

  if (!scrollable && e.touches.length === 1) {
    const dy = e.touches[0].clientY - _touchStartY;
    if (dy > 80 && window.scrollY <= 0) {
      e.preventDefault();
    }
  }
}, { passive: false });

/* =====================================================================
   9. HANDLE BACK BUTTON (Bot API 7.0+)
   ===================================================================== */
if (tg.BackButton && tg.onEvent) {
  tg.onEvent('backButtonClicked', () => {
    haptic('soft');
    if (typeof window.goBackFromDetail === 'function') {
      window.goBackFromDetail();
    } else {
      history.back();
    }
  });
}

/* =====================================================================
   10. LOG INFO (debug)
   ===================================================================== */
console.log('[tg] Mini App init', {
  version: tg.version,
  platform: tg.platform,
  colorScheme: tg.colorScheme,
  viewportStableHeight: tg.viewportStableHeight,
  initDataLength: tg.initData ? tg.initData.length : 0,
});

})();