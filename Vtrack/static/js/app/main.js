/* =====================================================================
   main.js — Entry Point
   =====================================================================
   Fungsi:
     - Data loading (loadVehicles, loadRecords, reloadAll, reloadAfterWrite)
     - Delete operations (deleteRecord, deleteVehicle)
     - Bootstrap / init()

   Depends:
     - SEMUA file di atas
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;
const { state, $, api, toast, escapeHtml, ICONS } = VT;

/* ============================================================
   DATA LOADING
   ============================================================ */

async function loadVehicles() {
  const res = await api('/api/vehicles');
  state.vehicles = res.items || [];
  const sel = $('#vehicle-select');
  if (!sel) return;
  const cur = state.currentVehicle;
  sel.innerHTML = '<option value="">Semua Kendaraan</option>' +
    state.vehicles.map((v) =>
      `<option value="${v.id}">${escapeHtml(v.nama)} · ${escapeHtml(v.plat_nomor || '-')}</option>`
    ).join('');
  sel.value = cur;
}

async function loadRecords(collection) {
  const filter = state.currentVehicle ? `vehicle="${state.currentVehicle}"` : '';
  const params = new URLSearchParams();
  if (filter) params.set('filter', filter);

  const SORTS = {
    service_records: '-tanggal',
    fuel_logs:       '-tanggal',
    documents:       '-tanggal_kadaluarsa',
    reminders:       'status,-created',
  };
  params.set('sort', SORTS[collection] || '-created');

  const res = await api(`/api/records/${collection}?${params}`);
  state.records[collection] = res.items || [];
}

async function reloadAll() {
  const content = $('#content');
  if (content) {
    content.innerHTML = `<div class="d-flex justify-content-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>`;
  }

  try {
    await loadVehicles();

    let need = [];
    if (state.view === 'dashboard' || state.view === 'detail') {
      need = ['service_records', 'fuel_logs', 'documents', 'reminders'];
    }
    // ⬇️ BARU: reports butuh SEMUA records
    else if (state.view === 'reports') {
      need = ['service_records', 'fuel_logs', 'documents', 'reminders'];
    }
    else if (state.view === 'service_records') need = ['service_records'];
    else if (state.view === 'fuel_logs') need = ['fuel_logs'];
    else if (state.view === 'documents') need = ['documents'];
    else if (state.view === 'reminders') need = ['reminders'];
    else if (state.view === 'form') {
      if (state.currentFormId) {
        if (state.currentFormType === 'service') need = ['service_records'];
        else if (state.currentFormType === 'fuel') need = ['fuel_logs'];
        else if (state.currentFormType === 'document') need = ['documents'];
        else if (state.currentFormType === 'reminder') need = ['reminders'];
      }
    }

    if (need.length) await Promise.all(need.map(loadRecords));
    VT.render();
  } catch (e) {
    if (content) {
      content.innerHTML = `<div class="alert alert-danger">Error: ${escapeHtml(e.message)}</div>`;
    }
  }
}

async function reloadAfterWrite({ delayMs = 300, retries = 1 } = {}) {
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  await reloadAll();

  if (retries > 0) {
    const currentColl = {
      service_records: 'service_records',
      fuel_logs: 'fuel_logs',
      documents: 'documents',
      reminders: 'reminders',
    }[state.view];

    if (currentColl && !(state.records[currentColl] || []).length) {
      await new Promise((r) => setTimeout(r, 400));
      await reloadAll();
    }
  }
}

/* ============================================================
   DELETE OPERATIONS
   ============================================================ */

async function deleteRecord(collection, id) {
  if (!confirm('Hapus catatan ini?')) return;
  try {
    await api(`/api/records/${collection}/${id}`, { method: 'DELETE' });
    toast('Catatan dihapus');
    await reloadAfterWrite({ delayMs: 200 });
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deleteVehicle(id, nama) {
  if (!confirm(`Hapus kendaraan "${nama}"?\n\nSemua riwayat servis, BBM, dokumen, dan pengingat juga akan terhapus.`)) return;
  try {
    await api(`/api/vehicles/${id}`, { method: 'DELETE' });
    toast('Kendaraan dihapus');
    if (state.currentVehicle === id) state.currentVehicle = '';
    if (state.currentDetailId === id) state.currentDetailId = null;
    await reloadAfterWrite({ delayMs: 200 });
  } catch (e) {
    toast(e.message, 'error');
  }
}

/* ============================================================
   INIT
   ============================================================ */

async function init() {
  // Inject CSS untuk animasi spin (kalau belum ada)
  if (!document.getElementById('vt-spin-style')) {
    const style = document.createElement('style');
    style.id = 'vt-spin-style';
    style.textContent = `.spin-anim{display:inline-block;animation:spin 700ms linear infinite;}@keyframes spin{to{transform:rotate(360deg);}}`;
    document.head.appendChild(style);
  }

  // Theme
  if (!window.VT_MINI_APP_MODE) {
    VT.initTheme();
  }

  // Navigation & header
  VT.initSidebar();
  VT.initHeader();

  // Popstate — sudah di initHeader
  // Apply location pertama kali
  VT.applyLocation();
}

/* ============================================================
   EXPOSE
   ============================================================ */

Object.assign(VT, {
  loadVehicles,
  loadRecords,
  reloadAll,
  reloadAfterWrite,
  deleteRecord,
  deleteVehicle,
});

// Expose global untuk inline onclick
window.deleteRecord  = deleteRecord;
window.deleteVehicle = deleteVehicle;
window.reloadAll     = reloadAll;
window.reloadAfterWrite = reloadAfterWrite;

// Expose init untuk Mini App
window.__vt_init = init;

// Auto-init kalau bukan Mini App
if (!window.VT_MINI_APP_MODE) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

console.log('[app] main.js loaded');

})();