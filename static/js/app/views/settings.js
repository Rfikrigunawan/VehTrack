/* =====================================================================
   views/settings.js — Halaman Settings (Profil + Telegram + Akun)
   =====================================================================
   Layout (v1.3):
     Desktop (≥992px): Grid 2 kolom
       ┌──────────────┬──────────────┐
       │ Profil       │ Telegram     │
       ├──────────────┴──────────────┤
       │ Danger Zone (full width)    │
       └─────────────────────────────┘

     Mobile (<992px): Stack 1 kolom

   Depends:
     - utils/*
     - core/api.js
     - core/router.js
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;
const { $, api, toast, icon, iconHtml, escapeHtml } = VT;
const { fmtDate } = VT;

/* ============================================================
   CONSTANTS
   ============================================================ */

const PASSWORD_MIN_LENGTH = 8;

/* ============================================================
   TOKEN HELPERS
   ============================================================ */

function parseTokenTs(token) {
  if (!token || !token.includes('.')) return null;
  const ts = parseInt(token.split('.', 1)[0], 10);
  return Number.isFinite(ts) ? ts : null;
}

function isTokenFresh(token, ttlSec = 300) {
  const ts = parseTokenTs(token);
  return ts ? (Date.now() / 1000) - ts < ttlSec : false;
}

function fmtCountdown(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

let _tokenCountdownTimer = null;

function stopTokenCountdown() {
  if (_tokenCountdownTimer) {
    clearInterval(_tokenCountdownTimer);
    _tokenCountdownTimer = null;
  }
}

/* ============================================================
   MAIN RENDER
   ============================================================ */

async function renderSettings() {
  stopTokenCountdown();
  const content = $('#content');
  if (!content) return;

  content.innerHTML = `
    <div class="d-flex justify-content-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>`;

  let me;
  try {
    const res = await api('/api/auth/me');
    me = res.user;
  } catch (e) {
    const msg = (e.message || '').toLowerCase();

    if (
      msg.includes('not found') ||
      msg.includes('404') ||
      msg.includes('unauthorized') ||
      msg.includes('401')
    ) {
      console.warn('[settings] Session invalid, redirecting to login');
      toast('Session berakhir. Silakan login ulang.', 'error');
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      return;
    }

    content.innerHTML = `<div class="alert alert-danger">Error: ${escapeHtml(e.message)}</div>`;
    return;
  }

  /* ---------- Compute states ---------- */
  const linked = !!me.telegram_id;
  const username = me.telegram_username ? '@' + me.telegram_username : '(tanpa username)';
  const linkedAt = me.telegram_linked_at ? fmtDate(me.telegram_linked_at) : '-';
  const initial = (me.name || me.email || '?').charAt(0).toUpperCase();

  /* ---------- Profile Card ---------- */
  const profileCard = `
    <div class="settings-card">
      <div class="settings-card-header">
        <div class="settings-card-icon tone-primary">
          ${iconHtml('user')}
        </div>
        <div class="settings-card-title-group">
          <h3 class="settings-card-title">Profil</h3>
          <p class="settings-card-subtitle">Informasi akun Anda</p>
        </div>
      </div>

      <!-- Avatar + Name highlight -->
      <div class="settings-profile-hero">
        <div class="settings-profile-avatar">${escapeHtml(initial)}</div>
        <div class="settings-profile-info">
          <div class="settings-profile-name">${escapeHtml(me.name || '-')}</div>
          <div class="settings-profile-email">${escapeHtml(me.email || '-')}</div>
        </div>
      </div>

      <div class="settings-card-body">
        <div class="settings-row">
          <div class="settings-row-label">
            ${iconHtml('envelope', 'me-2')} Email
          </div>
          <div class="settings-row-value">
            ${escapeHtml(me.email || '-')}
            ${me.verified
              ? `<span class="settings-badge tone-success" title="Email terverifikasi">${iconHtml('check')}</span>`
              : `<span class="settings-badge tone-warning" title="Email belum terverifikasi">${iconHtml('warning')}</span>`}
          </div>
        </div>

        <div class="settings-row">
          <div class="settings-row-label">
            ${iconHtml('phone', 'me-2')} No. HP
          </div>
          <div class="settings-row-value">
            ${me.no_hp ? escapeHtml(me.no_hp) : '<span class="settings-muted">Belum diisi</span>'}
          </div>
        </div>

        <div class="settings-row">
          <div class="settings-row-label">
            ${iconHtml('lock', 'me-2')} Password
          </div>
          <div class="settings-row-value">
            ${me.password_set
              ? `<span class="settings-badge tone-success">Sudah di-set</span>`
              : `<span class="settings-badge tone-warning">Default — segera ganti!</span>`}
          </div>
        </div>
      </div>

      <div class="settings-card-actions">
        <button id="btn-edit-profile" class="btn btn-primary btn-sm">
          ${iconHtml('edit', 'me-1')} Edit Profil
        </button>
        <button id="btn-change-password" class="btn btn-light btn-sm">
          ${iconHtml('lock', 'me-1')} Ganti Password
        </button>
      </div>
    </div>
  `;

  /* ---------- Telegram Card ---------- */
  const telegramStatusBadge = linked
    ? `<span class="settings-badge tone-success">LINKED</span>`
    : `<span class="settings-badge tone-neutral">BELUM</span>`;

  let telegramBodyHtml;
  if (linked) {
    telegramBodyHtml = `
      <div class="settings-info-block tone-success mb-3">
        <div class="settings-info-row">
          <span class="settings-info-key">Username</span>
          <span class="settings-info-val">${escapeHtml(username)}</span>
        </div>
        <div class="settings-info-row">
          <span class="settings-info-key">Telegram ID</span>
          <span class="settings-info-val font-monospace">${escapeHtml(me.telegram_id)}</span>
        </div>
        <div class="settings-info-row">
          <span class="settings-info-key">Di-link pada</span>
          <span class="settings-info-val">${linkedAt}</span>
        </div>
      </div>
      <button id="btn-unlink" class="btn btn-outline-danger btn-sm w-100">
        ${iconHtml('close', 'me-1')} Unlink Telegram
      </button>
    `;
  } else {
    telegramBodyHtml = `
      <div class="settings-token-actions mb-3">
        <button id="btn-gen-token" class="btn btn-primary w-100">
          ${iconHtml('key', 'me-1')} Buat Token
        </button>
        <div id="token-area" class="settings-token-placeholder">
          Token akan muncul di sini setelah Anda klik "Buat Token"
        </div>
      </div>
      <div class="settings-guide">
        <div class="settings-guide-header">
          ${iconHtml('book', 'me-2')}
          <strong>Panduan Singkat</strong>
        </div>
        <ol class="settings-guide-list">
          <li>Klik tombol <b>Buat Token</b> di atas</li>
          <li>Token muncul — klik untuk <b>copy perintah</b></li>
          <li>Buka <b>Telegram</b>, cari bot, <b>paste</b> perintah</li>
          <li>Tunggu balasan <b>✅ Berhasil di-link!</b></li>
          <li>Balik ke sini, klik <b>Refresh</b> di kanan atas</li>
        </ol>
        <div class="settings-guide-note">
          ${iconHtml('lock', 'me-1')}
          Token hanya berlaku <b>5 menit</b> dan sekali pakai.
        </div>
      </div>
    `;
  }

  const telegramCard = `
    <div class="settings-card">
      <div class="settings-card-header">
        <div class="settings-card-icon tone-info">
          ${iconHtml('telegram')}
        </div>
        <div class="settings-card-title-group">
          <h3 class="settings-card-title">Telegram Bot</h3>
          <p class="settings-card-subtitle">
            Notifikasi pengingat via Telegram
          </p>
        </div>
        ${telegramStatusBadge}
      </div>
      <div class="settings-card-body">
        ${telegramBodyHtml}
      </div>
    </div>
  `;

  /* ---------- Danger Zone ---------- */
  const dangerCard = `
    <div class="settings-card settings-card-danger">
      <div class="settings-card-header">
        <div class="settings-card-icon tone-danger">
          ${iconHtml('warning')}
        </div>
        <div class="settings-card-title-group">
          <h3 class="settings-card-title">Hapus Akun</h3>
          <p class="settings-card-subtitle">
            Semua data akan dihapus permanen
          </p>
        </div>
      </div>
      <div class="settings-card-body">
        <div class="settings-danger-block">
          <div class="settings-danger-text">
            <strong>Hapus akun & semua data</strong>
            <p>Kendaraan, servis, BBM, dokumen, dan pengingat akan dihapus. Tindakan ini tidak bisa dibatalkan.</p>
          </div>
          <button id="btn-delete-account" class="btn btn-outline-danger btn-sm">
            ${iconHtml('delete', 'me-1')} Hapus Akun
          </button>
        </div>
      </div>
    </div>
  `;

  /* ---------- Full Layout — GRID 2 KOLOM ---------- */
  content.innerHTML = `
    <div class="settings-page">
      <div class="settings-grid">
        <div class="settings-col">${profileCard}</div>
        <div class="settings-col">${telegramCard}</div>
        <div class="settings-col settings-col-full">${dangerCard}</div>
      </div>
    </div>
  `;

  /* ---------- Attach Events ---------- */
  attachSettingsEvents(me);
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */

function attachSettingsEvents(me) {
  const editProfileBtn = $('#btn-edit-profile');
  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', () => openEditProfileModal(me));
  }

  const changePwdBtn = $('#btn-change-password');
  if (changePwdBtn) {
    changePwdBtn.addEventListener('click', () => openChangePasswordModal());
  }

  if (me.telegram_id) {
    const unlinkBtn = $('#btn-unlink');
    if (unlinkBtn) {
      unlinkBtn.addEventListener('click', async () => {
        if (!confirm('Putuskan tautan Telegram?')) return;
        try {
          await api('/api/telegram/unlink', { method: 'POST' });
          toast('Telegram berhasil di-unlink');
          renderSettings();
        } catch (e) {
          toast(e.message, 'error');
        }
      });
    }
  } else {
    const genBtn = $('#btn-gen-token');
    if (genBtn) {
      genBtn.addEventListener('click', generateTokenInline);
    }

    const pendingToken = me.telegram_link_token || '';
    if (pendingToken && isTokenFresh(pendingToken)) {
      const ts = parseTokenTs(pendingToken);
      renderTokenInline({
        token: pendingToken,
        bot_username: me.telegram_bot_username || '',
        expires_at: ts + 300,
      });
    }
  }

  const deleteBtn = $('#btn-delete-account');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => deleteAccountConfirm(me));
  }
}

/* ============================================================
   EDIT PROFILE MODAL
   ============================================================ */

function openEditProfileModal(me) {
  const html = `
    <div class="form-section">
      <div class="form-section-header">
        <span class="form-section-icon tone-primary">
          ${iconHtml('user')}
        </span>
        <h6 class="form-section-title">Data Pribadi</h6>
      </div>
      <div class="form-section-body">

        <div class="form-field-modern">
          <label class="form-label-modern" for="f-name">
            Nama Lengkap <span class="req">*</span>
          </label>
          <div class="input-modern-wrap">
            <i class="${icon('user')} input-modern-icon"></i>
            <input type="text" name="name" id="f-name"
              value="${escapeHtml(me.name || '')}"
              required maxlength="50"
              placeholder="Budi Santoso"
              class="form-control-modern has-icon">
          </div>
          <div class="form-hint-modern">Minimal 2 karakter, maksimal 50 karakter</div>
        </div>

        <div class="form-field-modern">
          <label class="form-label-modern" for="f-email">
            Email <span class="req">*</span>
          </label>
          <div class="input-modern-wrap">
            <i class="${icon('envelope')} input-modern-icon"></i>
            <input type="email" name="email" id="f-email"
              value="${escapeHtml(me.email || '')}"
              required
              placeholder="nama@email.com"
              class="form-control-modern has-icon">
          </div>
          <div class="form-hint-modern">
            Email dipakai untuk reset password dan notifikasi penting
          </div>
        </div>

        <div class="form-field-modern">
          <label class="form-label-modern" for="f-no-hp">No. HP</label>
          <div class="input-modern-wrap">
            <i class="${icon('phone')} input-modern-icon"></i>
            <input type="tel" name="no_hp" id="f-no-hp"
              value="${escapeHtml(me.no_hp || '')}"
              placeholder="08123456789"
              inputmode="tel"
              class="form-control-modern has-icon">
          </div>
          <div class="form-hint-modern">Opsional — untuk komunikasi darurat</div>
        </div>

      </div>
    </div>
  `;

  showSettingsModal('Edit Profil', html, async (fd) => {
    const name = (fd.get('name') || '').trim();
    const email = (fd.get('email') || '').trim().toLowerCase();
    const no_hp = (fd.get('no_hp') || '').trim();

    if (!name || name.length < 2) {
      throw new Error('Nama minimal 2 karakter');
    }
    if (name.length > 50) {
      throw new Error('Nama maksimal 50 karakter');
    }
    if (!/^[a-zA-Z0-9\s\.\'-]+$/.test(name)) {
      throw new Error('Nama hanya boleh huruf, angka, spasi');
    }
    if (!email) {
      throw new Error('Email wajib diisi');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Format email tidak valid');
    }

    const payload = {};
    if (name !== me.name) payload.name = name;
    if (email !== me.email) payload.email = email;
    if (no_hp !== (me.no_hp || '')) payload.no_hp = no_hp;

    if (Object.keys(payload).length === 0) {
      toast('Tidak ada perubahan');
      return;
    }

    await api('/api/auth/update-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    toast('Profil berhasil diperbarui');
    renderSettings();
  });
}

/* ============================================================
   CHANGE PASSWORD MODAL
   ============================================================ */

function openChangePasswordModal() {
  const html = `
    <div class="form-section">
      <div class="form-section-header">
        <span class="form-section-icon tone-warning">
          ${iconHtml('lock')}
        </span>
        <h6 class="form-section-title">Keamanan Akun</h6>
      </div>
      <div class="form-section-body">

        <div class="form-field-modern">
          <label class="form-label-modern" for="f-old-pwd">
            Password Lama <span class="req">*</span>
          </label>
          <div class="input-modern-wrap">
            <i class="${icon('lock')} input-modern-icon"></i>
            <input type="password" name="old_password" id="f-old-pwd"
              required
              autocomplete="current-password"
              placeholder="Password saat ini"
              class="form-control-modern has-icon">
            <button type="button" class="btn-eye-inline" data-toggle-pwd="f-old-pwd">
              <i class="${icon('eye')}"></i>
            </button>
          </div>
        </div>

        <div class="form-field-modern">
          <label class="form-label-modern" for="f-new-pwd">
            Password Baru <span class="req">*</span>
          </label>
          <div class="input-modern-wrap">
            <i class="${icon('lock')} input-modern-icon"></i>
            <input type="password" name="new_password" id="f-new-pwd"
              required
              autocomplete="new-password"
              placeholder="Minimal ${PASSWORD_MIN_LENGTH} karakter"
              class="form-control-modern has-icon">
            <button type="button" class="btn-eye-inline" data-toggle-pwd="f-new-pwd">
              <i class="${icon('eye')}"></i>
            </button>
          </div>
          <div class="form-hint-modern" id="pwd-strength">
            Minimal ${PASSWORD_MIN_LENGTH} karakter
          </div>
        </div>

        <div class="form-field-modern">
          <label class="form-label-modern" for="f-confirm-pwd">
            Konfirmasi Password Baru <span class="req">*</span>
          </label>
          <div class="input-modern-wrap">
            <i class="${icon('shield')} input-modern-icon"></i>
            <input type="password" name="new_password_confirm" id="f-confirm-pwd"
              required
              autocomplete="new-password"
              placeholder="Ulangi password baru"
              class="form-control-modern has-icon">
            <button type="button" class="btn-eye-inline" data-toggle-pwd="f-confirm-pwd">
              <i class="${icon('eye')}"></i>
            </button>
          </div>
        </div>

        <div class="settings-security-tips">
          <div class="settings-security-tips-header">
            ${iconHtml('shield', 'me-2')}
            <strong>Tips Password:</strong>
          </div>
          <ul>
            <li>Gunakan minimal <strong>${PASSWORD_MIN_LENGTH} karakter</strong></li>
            <li>Disarankan gunakan kombinasi huruf & angka</li>
            <li>Jangan pakai informasi pribadi (tanggal lahir, nama)</li>
            <li>Jangan pakai password yang sama dengan akun lain</li>
          </ul>
        </div>

      </div>
    </div>
  `;

  showSettingsModal('Ganti Password', html, async (fd) => {
    const old_password = fd.get('old_password') || '';
    const new_password = fd.get('new_password') || '';
    const new_password_confirm = fd.get('new_password_confirm') || '';

    if (!old_password) {
      throw new Error('Password lama wajib diisi');
    }
    if (!new_password) {
      throw new Error('Password baru wajib diisi');
    }
    if (new_password.length < PASSWORD_MIN_LENGTH) {
      throw new Error(`Password baru minimal ${PASSWORD_MIN_LENGTH} karakter`);
    }
    if (new_password !== new_password_confirm) {
      throw new Error('Konfirmasi password tidak sama');
    }
    if (old_password === new_password) {
      throw new Error('Password baru harus berbeda dari password lama');
    }

    await api('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        old_password,
        new_password,
        new_password_confirm,
      }),
    });

    toast('Password berhasil diubah! Silakan login ulang.');

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
    } catch (e) {}

    setTimeout(() => {
      window.location.href = '/';
    }, 1500);
  });

  setTimeout(() => {
    attachPasswordStrengthIndicator();
    attachPasswordToggles();
  }, 100);
}

/* ============================================================
   PASSWORD STRENGTH INDICATOR
   ============================================================ */

function attachPasswordStrengthIndicator() {
  const pwdInput = $('#f-new-pwd');
  const indicator = $('#pwd-strength');
  if (!pwdInput || !indicator) return;

  const updateStrength = () => {
    const pwd = pwdInput.value;
    if (!pwd) {
      indicator.innerHTML = `Minimal ${PASSWORD_MIN_LENGTH} karakter`;
      indicator.className = 'form-hint-modern';
      return;
    }

    const len = pwd.length;
    const hasMixed = /[a-zA-Z]/.test(pwd) && /\d/.test(pwd);
    const hasSymbol = /[^a-zA-Z0-9]/.test(pwd);

    let label = '';
    let cls = '';

    if (len < PASSWORD_MIN_LENGTH) {
      label = `Terlalu pendek (${len}/${PASSWORD_MIN_LENGTH})`;
      cls = 'tone-danger';
    } else if (len < 10) {
      label = `Cukup (${len} karakter)`;
      cls = 'tone-warning';
    } else if (len < 14 || !hasMixed) {
      label = `Baik (${len} karakter)`;
      cls = 'tone-info';
    } else if (hasMixed && hasSymbol) {
      label = `Sangat kuat (${len} karakter)`;
      cls = 'tone-success';
    } else {
      label = `Kuat (${len} karakter)`;
      cls = 'tone-success';
    }

    const progress = Math.min(100, (len / 20) * 100);

    indicator.className = `form-hint-modern settings-pwd-strength ${cls}`;
    indicator.innerHTML = `
      <div class="d-flex justify-content-between align-items-center" style="gap:8px;">
        <span>Kekuatan: <strong>${label}</strong></span>
      </div>
      <div class="settings-pwd-bar">
        <div class="settings-pwd-bar-fill" style="width: ${progress}%"></div>
      </div>
    `;
  };

  pwdInput.addEventListener('input', updateStrength);
  updateStrength();
}

/* ============================================================
   PASSWORD VISIBILITY TOGGLE
   ============================================================ */

function attachPasswordToggles() {
  document.querySelectorAll('[data-toggle-pwd]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-toggle-pwd');
      const input = document.getElementById(targetId);
      if (!input) return;

      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';

      const iconEl = btn.querySelector('i');
      if (iconEl) {
        iconEl.className = showing ? VT.icon('eye') : VT.icon('eyeSlash');
      }
      input.focus();
    });
  });
}

/* ============================================================
   DELETE ACCOUNT
   ============================================================ */

function deleteAccountConfirm(me) {
  const html = `
    <div class="settings-danger-warning">
      <div class="settings-danger-warning-icon">
        ${iconHtml('warning')}
      </div>
      <h4 class="settings-danger-warning-title">Yakin ingin hapus akun?</h4>
      <p class="settings-danger-warning-text">
        Tindakan ini <strong>tidak bisa dibatalkan</strong>. Semua data berikut akan dihapus permanen:
      </p>
      <ul class="settings-danger-warning-list">
        <li>${iconHtml('car', 'me-1')} Semua kendaraan</li>
        <li>${iconHtml('service', 'me-1')} Semua riwayat servis</li>
        <li>${iconHtml('fuel', 'me-1')} Semua catatan BBM</li>
        <li>${iconHtml('document', 'me-1')} Semua dokumen</li>
        <li>${iconHtml('reminder', 'me-1')} Semua pengingat</li>
      </ul>
      <div class="form-field-modern mt-4">
        <label class="form-label-modern">
          Ketik <code>${escapeHtml(me.email)}</code> untuk konfirmasi:
        </label>
        <input type="text" id="delete-confirm-input"
          placeholder="${escapeHtml(me.email)}"
          autocomplete="off"
          class="form-control-modern">
      </div>
    </div>
  `;

  showSettingsModal('Hapus Akun', html, async () => {
    const input = $('#delete-confirm-input');
    const typed = (input?.value || '').trim();

    if (typed !== me.email) {
      throw new Error('Email tidak sesuai. Ketik dengan benar untuk konfirmasi.');
    }

    await api('/api/auth/delete-account', { method: 'POST' });

    toast('Akun berhasil dihapus. Sampai jumpa!');

    setTimeout(() => {
      window.location.href = '/';
    }, 1500);
  }, {
    submitLabel: 'Hapus Akun',
    submitClass: 'btn-danger',
  });
}

/* ============================================================
   SETTINGS MODAL (generic)
   ============================================================ */

let _settingsModalInstance = null;

function showSettingsModal(title, html, onSubmit, opts = {}) {
  const { submitLabel = 'Simpan', submitClass = 'btn-primary' } = opts;

  const modalEl = document.getElementById('modal');
  if (!modalEl) {
    console.error('[settings] #modal tidak ditemukan');
    return;
  }

  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  const submitBtn = document.getElementById('modal-submit');
  const form = document.getElementById('modal-form');

  if (!titleEl || !bodyEl || !submitBtn || !form) return;

  titleEl.textContent = title;
  bodyEl.innerHTML = html;

  submitBtn.style.display = '';
  submitBtn.disabled = false;
  submitBtn.className = `btn ${submitClass}`;
  submitBtn.textContent = submitLabel;

  if (typeof VT.attachFormHooks === 'function') {
    VT.attachFormHooks(bodyEl);
  }

  if (!_settingsModalInstance) {
    _settingsModalInstance = new bootstrap.Modal(modalEl);
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Memproses...';

    try {
      const fd = new FormData(form);
      for (const [k, v] of [...fd.entries()]) {
        if (v instanceof File && !v.name) fd.delete(k);
      }
      await onSubmit(fd);
      _settingsModalInstance.hide();
    } catch (err) {
      toast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  };

  _settingsModalInstance.show();
}

/* ============================================================
   TELEGRAM TOKEN GENERATION
   ============================================================ */

async function generateTokenInline() {
  const area = $('#token-area');
  const btn = $('#btn-gen-token');
  if (!area || !btn) return;

  stopTokenCountdown();
  btn.disabled = true;
  const original = btn.innerHTML;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Memuat...';

  area.className = 'settings-token-loading';
  area.innerHTML = '<div class="spinner-border spinner-border-sm text-primary"></div>';

  try {
    const data = await api('/api/telegram/generate-token', { method: 'POST' });
    renderTokenInline(data);
  } catch (e) {
    area.className = 'settings-token-error';
    area.textContent = `Error: ${e.message}`;
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

function renderTokenInline(data) {
  stopTokenCountdown();

  const area = $('#token-area');
  const btn = $('#btn-gen-token');
  if (!area || !btn) return;

  const cmd = `/link ${data.token}`;
  const botUser = data.bot_username ? '@' + data.bot_username : 'bot';
  const expiresAt = data.expires_at || (parseTokenTs(data.token) + 300);

  area.className = 'settings-token-wrapper';
  area.innerHTML = `
    <button id="btn-copy-cmd" type="button" class="settings-token-btn">
      <div class="settings-token-btn-label">
        ${iconHtml('copy')}
        <span>Klik untuk copy — kirim ke ${escapeHtml(botUser)}</span>
      </div>
      <div class="settings-token-btn-cmd">${escapeHtml(cmd)}</div>
    </button>
    <div class="settings-token-footer">
      <span class="settings-token-timer">
        ${iconHtml('stopwatch', 'me-1')}Kadaluarsa dalam
        <span id="token-countdown" class="settings-token-countdown">--:--</span>
      </span>
      <span id="copy-feedback" class="settings-token-feedback"></span>
    </div>
  `;

  btn.disabled = false;
  btn.innerHTML = `${iconHtml('refresh', 'me-1')} Buat Ulang`;
  btn.classList.remove('btn-primary');
  btn.classList.add('btn-secondary');

  $('#btn-copy-cmd').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(cmd);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = cmd;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(ta);
    }

    const fb = $('#copy-feedback');
    if (fb) {
      fb.textContent = '✓ Dicopy!';
      fb.className = 'settings-token-feedback tone-success';
      setTimeout(() => {
        const f = $('#copy-feedback');
        if (f) { f.textContent = ''; f.className = 'settings-token-feedback'; }
      }, 2500);
    }
    toast('Perintah /link dicopy — paste di Telegram');
  });

  function tick() {
    const remain = Math.max(0, Math.floor(expiresAt - Date.now() / 1000));
    const el = document.getElementById('token-countdown');
    if (el) el.textContent = fmtCountdown(remain);
    if (remain <= 0) {
      stopTokenCountdown();
      handleTokenExpired();
    }
  }
  tick();
  _tokenCountdownTimer = setInterval(tick, 1000);
}

async function handleTokenExpired() {
  try { await api('/api/telegram/clear-token', { method: 'POST' }); } catch (e) {}

  const area = $('#token-area');
  const btn = $('#btn-gen-token');
  if (!area || !btn) return;

  area.className = 'settings-token-placeholder';
  area.textContent = 'Token kadaluarsa. Klik "Buat Token" untuk yang baru.';

  btn.innerHTML = `${iconHtml('key', 'me-1')} Buat Token`;
  btn.disabled = false;
  btn.classList.remove('btn-secondary');
  btn.classList.add('btn-primary');

  toast('Token kadaluarsa — silakan buat token baru', 'error');
}

/* ============================================================
   EXPOSE
   ============================================================ */
Object.assign(VT, {
  renderSettings,
  generateTokenInline,
  renderTokenInline,
  handleTokenExpired,
  stopTokenCountdown,
  openEditProfileModal,
  openChangePasswordModal,
  deleteAccountConfirm,
});

console.log('[app] views/settings loaded');

})();