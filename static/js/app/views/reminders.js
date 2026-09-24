/* =====================================================================
   views/reminders.js — Halaman List Pengingat
   =====================================================================
   Fungsi:
     - renderReminders()

   Depends:
     - utils/*
     - core/state.js
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;
const { state, $, icon, iconHtml } = VT;
const { fmtDate, fmtNum, escapeHtml, daysUntil } = VT;

function renderReminders() {
  const content = $('#content');
  const items = state.records.reminders || [];

  content.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3 gap-3 flex-wrap">
      <div class="text-secondary small">${items.length} pengingat</div>
      <button onclick="goToForm('reminder')" class="btn btn-primary btn-sm">
        ${iconHtml('add', 'me-1')} Tambah Pengingat
      </button>
    </div>
    ${items.length ? `
      <div class="row row-cols-1 row-cols-sm-2 g-3">
        ${items.map((r) => {
          const v = state.vehicles.find((x) => x.id === r.vehicle);
          let badgeCls = 'bg-info-soft', statusLabel = 'Upcoming', info = '';
          if (r.status === 'done')      { badgeCls = 'bg-success-soft'; statusLabel = 'Selesai'; }
          else if (r.status === 'skip') { badgeCls = 'bg-neutral-soft'; statusLabel = 'Dilewati'; }
          else if (r.tipe === 'tanggal' && r.target_date) {
            const dd = daysUntil(r.target_date);
            info = `${dd} hari`;
            if (dd < 0)        { badgeCls = 'bg-danger-soft';  statusLabel = `Terlewat ${Math.abs(dd)} hari`; }
            else if (dd === 0) { badgeCls = 'bg-danger-soft';  statusLabel = 'Hari ini!'; }
            else if (dd <= 7)  { badgeCls = 'bg-warning-soft'; statusLabel = `${dd} hari lagi`; }
          } else if (r.tipe === 'km' && v) {
            const sisa = (r.target_km || 0) - (v.odometer_terakhir || 0);
            info = `${fmtNum(sisa)} km`;
            if (sisa < 0)         { badgeCls = 'bg-danger-soft';  statusLabel = `Lewat ${fmtNum(Math.abs(sisa))} km`; }
            else if (sisa === 0)  { badgeCls = 'bg-danger-soft';  statusLabel = 'Sekarang!'; }
            else if (sisa <= 500) { badgeCls = 'bg-warning-soft'; statusLabel = `${fmtNum(sisa)} km lagi`; }
          }
          return `
            <div class="col">
              <div class="card card-hover h-100">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-start mb-3 gap-2">
                    <div class="flex-grow-1 min-w-0">
                      <div class="fw-bold text-truncate">${escapeHtml(r.judul)}</div>
                      <div class="text-secondary small mt-1">${escapeHtml(v ? v.nama : '-')} · ${r.tipe === 'km' ? `Target ${fmtNum(r.target_km)} km` : `Target ${fmtDate(r.target_date)}`}</div>
                    </div>
                    <div class="d-flex gap-1 flex-shrink-0">
                      <button onclick="goToForm('reminder', '${r.id}')" class="btn btn-light btn-icon-sm" title="Edit">
                        ${iconHtml('edit')}
                      </button>
                      <button onclick="deleteRecord('reminders','${r.id}')" class="btn btn-light btn-icon-sm" title="Hapus">
                        <i class="${icon('delete')} text-danger"></i>
                      </button>
                    </div>
                  </div>
                  <div class="d-flex align-items-center gap-2">
                    <span class="badge-status ${badgeCls}">${statusLabel}</span>
                    ${info ? `<span class="text-secondary small">${info}</span>` : ''}
                  </div>
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>
    ` : `<div class="empty-state card mx-auto text-center" style="max-width:480px;">
          <div class="card-body p-5">
            <i class="${icon('reminder')} text-secondary" style="font-size:64px;opacity:0.35;"></i>
            <h3 class="h5 fw-bold mt-3 mb-2">Belum ada pengingat</h3>
            <p class="text-secondary mb-4">Buat pengingat ganti oli, pajak, atau servis rutin.</p>
            <button onclick="goToForm('reminder')" class="btn btn-primary">Tambah Pengingat</button>
          </div>
        </div>`}
  `;
}

Object.assign(VT, { renderReminders });

})();