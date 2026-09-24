/* =====================================================================
   form/page.js — Form Page Mode (Full Page)
   =====================================================================
   Fungsi:
     - renderFormPage(type, id) — dipanggil oleh renderer
     - Form submit handler

   Depends:
     - utils/*
     - core/state.js
     - core/api.js
     - core/router.js
     - form/hooks.js
     - form/definitions.js
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;
const { state, $, toast, escapeHtml, attachFormHooks, FORMS } = VT;

function renderFormPage(type, id = null) {
  const def = FORMS[type];
  const contentEl = $('#content');
  if (!contentEl) return;

  if (!def) {
    contentEl.innerHTML = `<div class="alert alert-danger m-4">Tipe form tidak dikenal: ${escapeHtml(type)}</div>`;
    return;
  }

  if (type !== 'vehicle' && !state.vehicles.length) {
    contentEl.innerHTML = `
      <div class="form-page">
        <div class="alert alert-warning d-flex align-items-center gap-2">
          <i class="${VT.icon('warningFill')}"></i>
          <div>Tambahkan kendaraan dulu sebelum mencatat ${escapeHtml(type)}.</div>
          <button class="btn btn-sm btn-primary ms-auto" onclick="goToForm('vehicle')">
            Tambah Kendaraan
          </button>
        </div>
      </div>
    `;
    return;
  }

  const { html, submit } = def(id || null);

  const backMap = {
    vehicle:  'vehicles',
    service:  'service_records',
    fuel:     'fuel_logs',
    document: 'documents',
    reminder: 'reminders',
  };
  const backView = backMap[type] || 'dashboard';

  contentEl.innerHTML = `
    <div class="form-page">
      <div class="form-page-inner">

        <button type="button" class="form-page-back" data-back>
          <i class="${VT.icon('back')}"></i> Kembali
        </button>

        <form id="form-page-element" class="form-page-form" novalidate>
          <div class="form-page-body">
            ${html}
          </div>

          <div class="form-page-actions">
            <button type="button" class="btn btn-light" data-back>
              Batal
            </button>
            <button type="submit" id="form-page-submit" class="btn btn-primary">
              <i class="${VT.icon('save')} me-1"></i> Simpan
            </button>
          </div>
        </form>

      </div>
    </div>
  `;

  attachFormHooks(contentEl);

  contentEl.querySelectorAll('[data-back]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      VT.navigateTo(backView);
    });
  });

  const form = document.getElementById('form-page-element');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('form-page-submit');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Menyimpan...';

    try {
      const fd = new FormData(form);
      for (const [k, v] of [...fd.entries()]) {
        if (v instanceof File && !v.name) fd.delete(k);
      }
      await submit(fd);
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = original;
    }
  };
}

Object.assign(VT, { renderFormPage });

// Expose untuk app.content.js
window.renderFormPage = renderFormPage;

})();