/* =====================================================================
   views/vehicles.js — Halaman List Kendaraan
   =====================================================================
   Fungsi:
     - renderVehicles()

   Depends:
     - utils/*
     - core/state.js
     - shared/files.js
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;
const { state, $, icon, iconHtml } = VT;
const { fmtNum, escapeHtml, escapeStr, jenisIcon, vehicleMeta } = VT;

function emptyState(iconName, title, desc, btnLabel, btnAction) {
  return `<div class="empty-state card mx-auto text-center" style="max-width:480px;">
    <div class="card-body p-5">
      <i class="${icon(iconName)} text-secondary" style="font-size:64px;opacity:0.35;"></i>
      <h3 class="h5 fw-bold mt-3 mb-2">${title}</h3>
      <p class="text-secondary mb-4">${desc}</p>
      <button onclick="${btnAction}" class="btn btn-primary">${btnLabel}</button>
    </div>
  </div>`;
}

function renderVehicles() {
  const content = $('#content');

  content.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3 gap-3 flex-wrap">
      <div class="text-secondary small">${state.vehicles.length} kendaraan terdaftar</div>
      <button onclick="goToForm('vehicle')" class="btn btn-primary btn-sm">
        ${iconHtml('add', 'me-1')} Tambah Kendaraan
      </button>
    </div>
    ${state.vehicles.length ? `
      <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3">
        ${state.vehicles.map((v) => `
          <div class="col">
            <div class="card card-hover card-clickable h-100 overflow-hidden"
                 data-vehicle-id="${v.id}">
              ${v.foto
                ? VT.vehiclePhotoHtml(v)
                : `<div class="vehicle-photo-banner bg-body-secondary d-flex align-items-center justify-content-center">
                     <i class="${icon(jenisIcon(v.jenis))} text-secondary" style="font-size:48px;opacity:0.5;"></i>
                   </div>`}
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                  <div class="fw-bold text-truncate flex-grow-1">${escapeHtml(v.nama)}</div>
                  <div class="d-flex gap-1 flex-shrink-0">
                    <button onclick="event.stopPropagation(); goToForm('vehicle', '${v.id}')" class="btn btn-light btn-icon-sm" title="Edit">
                      ${iconHtml('edit')}
                    </button>
                    <button onclick="event.stopPropagation(); deleteVehicle('${v.id}','${escapeStr(v.nama)}')" class="btn btn-light btn-icon-sm" title="Hapus">
                      <i class="${icon('delete')} text-danger"></i>
                    </button>
                  </div>
                </div>
                <div class="text-secondary small mb-3">${escapeHtml(vehicleMeta(v))}</div>
                <div class="d-flex justify-content-between small mb-1">
                  <span class="text-secondary">Plat</span>
                  <span class="font-monospace">${escapeHtml(v.plat_nomor || '-')}</span>
                </div>
                <div class="d-flex justify-content-between small mb-1">
                  <span class="text-secondary">Warna</span>
                  <span>${escapeHtml(v.warna || '-')}</span>
                </div>
                <div class="d-flex justify-content-between small">
                  <span class="text-secondary">Odometer</span>
                  <span class="fw-semibold">${fmtNum(v.odometer_terakhir)} km</span>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    ` : emptyState('car', 'Belum ada kendaraan', 'Tambahkan kendaraan pertama Anda.', 'Tambah Kendaraan', "goToForm('vehicle')")}
  `;

  content.querySelectorAll('.card-clickable[data-vehicle-id]').forEach((card) => {
    card.addEventListener('click', () => {
      VT.openVehicleDetail(card.getAttribute('data-vehicle-id'));
    });
  });
}

Object.assign(VT, { renderVehicles });

})();