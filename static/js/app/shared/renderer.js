/* =====================================================================
   shared/renderer.js — View Dispatcher
   =====================================================================
   Fungsi:
     - render()             → dispatch ke renderer berdasarkan state.view
     - updateFilterVisibility()
     - Metadata (title/subtitle) per view

   Depends:
     - utils/*
     - core/state.js
     - views/*
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;
const { state, $, getFormTitle } = VT;

/* ---------- Helpers ---------- */

function getFormSubtitle() {
  const isEdit = !!state.currentFormId;
  return isEdit ? 'Ubah data yang sudah tersimpan' : 'Lengkapi data di bawah ini';
}

function updateFilterVisibility() {
  const filterWrap = document.querySelector('.header-filter');
  if (!filterWrap) return;

  if (VT.FILTERABLE_VIEWS.includes(state.view)) {
    filterWrap.style.display = '';
    filterWrap.style.visibility = '';
    filterWrap.style.opacity = '';
  } else {
    filterWrap.style.display = 'none';
  }
}

/* ---------- Main render ---------- */
function render() {
  const content = $('#content');
  if (!content) return;

  // Header metadata
  const meta = {
    dashboard:       { title: 'Dashboard',        sub: 'Ringkasan kendaraan Anda' },
    detail:          { title: 'Detail Kendaraan', sub: 'Informasi lengkap kendaraan' },
    form:            { title: getFormTitle(state.currentFormType, state.currentFormId), sub: getFormSubtitle() },
    vehicles:        { title: 'Kendaraan',        sub: 'Kelola daftar kendaraan' },
    service_records: { title: 'Riwayat Servis',   sub: 'Catatan servis & perbaikan' },
    fuel_logs:       { title: 'Catatan BBM',      sub: 'Pengisian bahan bakar' },
    documents:       { title: 'Dokumen',          sub: 'STNK, pajak, asuransi, KIR' },
    reminders:       { title: 'Pengingat',        sub: 'Jadwal perawatan rutin' },
    reports:         { title: 'Laporan',          sub: 'Analisis & statistik kendaraan' },  // ⬅️ BARU
    settings:        { title: 'Pengaturan',       sub: 'Akun & integrasi' },
  };
  const m = meta[state.view] || meta.dashboard;
  const titleEl = $('#page-title');
  const subEl = $('#page-subtitle');
  if (titleEl) titleEl.textContent = m.title;
  if (subEl) subEl.textContent = m.sub;

  updateFilterVisibility();

  // Dispatch ke renderer
  const fn = {
    dashboard:       VT.renderDashboard,
    detail:          VT.renderDetail,
    form:            () => VT.renderFormPage(state.currentFormType, state.currentFormId),
    vehicles:        VT.renderVehicles,
    service_records: VT.renderServices,
    fuel_logs:       VT.renderFuels,
    documents:       VT.renderDocuments,
    reminders:       VT.renderReminders,
    reports:         VT.renderReports,        // ⬅️ BARU
    settings:        VT.renderSettings,
  }[state.view];

  if (typeof fn === 'function') fn();
}

Object.assign(VT, {
  render,
  updateFilterVisibility,
});

})();