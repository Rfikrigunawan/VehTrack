/* =====================================================================
   form/modal.js — Form Modal Mode
   =====================================================================
   Fungsi:
     - openFormModal(type, id)
     - openModal(title, html, onSubmit)
     - closeModal()

   Depends:
     - utils/*
     - core/state.js
     - core/api.js
     - form/hooks.js
     - form/definitions.js
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;
const { state, $, toast, attachFormHooks, FORMS, getFormTitle } = VT;

let _modalInstance = null;

function resetModalSubmitStyle() {
  const btn = $('#modal-submit');
  if (!btn) return;
  btn.textContent = 'Simpan';
  btn.disabled = false;
  btn.classList.remove('btn-secondary', 'btn-success', 'btn-danger');
  btn.classList.add('btn-primary');
}

function openModal(title, html, onSubmit) {
  const titleEl = $('#modal-title');
  const bodyEl = $('#modal-body');
  if (!titleEl || !bodyEl) return;

  titleEl.textContent = title;
  bodyEl.innerHTML = html;
  resetModalSubmitStyle();

  if (!_modalInstance) {
    _modalInstance = new bootstrap.Modal(document.getElementById('modal'));
  }

  attachFormHooks(bodyEl);

  const form = $('#modal-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('#modal-submit');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Menyimpan...';

    try {
      const fd = new FormData(form);
      for (const [k, v] of [...fd.entries()]) {
        if (v instanceof File && !v.name) fd.delete(k);
      }
      await onSubmit(fd);
      _modalInstance.hide();
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Simpan';
    }
  };

  _modalInstance.show();
}

function closeModal() {
  if (_modalInstance) _modalInstance.hide();
}

function openFormModal(type, id = null) {
  const def = FORMS[type];
  if (!def) return;

  if (type !== 'vehicle' && !state.vehicles.length) {
    return toast('Tambahkan kendaraan dulu', 'error');
  }

  const { html, submit } = def(id || null);
  openModal(getFormTitle(type, id), html, submit);
}

Object.assign(VT, {
  openModal,
  closeModal,
  openFormModal,
});

// Expose shortcut
window.openVehicleForm  = (id = null) => openFormModal('vehicle', id);
window.openServiceForm  = (id = null) => openFormModal('service', id);
window.openFuelForm     = (id = null) => openFormModal('fuel', id);
window.openDocumentForm = (id = null) => openFormModal('document', id);
window.openReminderForm = (id = null) => openFormModal('reminder', id);
window.closeModal       = closeModal;

})();