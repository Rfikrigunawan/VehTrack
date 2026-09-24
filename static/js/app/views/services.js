/* =====================================================================
   views/services.js — Halaman List Servis
   =====================================================================
   Fungsi:
     - renderServices()

   Depends:
     - utils/*
     - core/state.js
     - shared/files.js
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;
const { state, $, icon, iconHtml } = VT;
const { fmtDate, fmtNum, fmtRp, escapeHtml, normalizeFiles, fileGridHtml } = VT;

function renderServices() {
  const content = $('#content');
  const items = state.records.service_records || [];

  content.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3 gap-3 flex-wrap">
      <div class="text-secondary small">${items.length} catatan</div>
      <button onclick="goToForm('service')" class="btn btn-primary btn-sm">
        ${iconHtml('add', 'me-1')} Tambah Servis
      </button>
    </div>
    ${items.length ? `
      <div class="table-wrap">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Kategori</th>
              <th class="d-none d-md-table-cell">Bengkel</th>
              <th class="text-end">Odometer</th>
              <th class="text-end">Biaya</th>
              <th class="text-center">Nota</th>
              <th class="text-end"></th>
            </tr>
          </thead>
          <tbody>
            ${items.map((r) => {
              const notes = normalizeFiles(r.foto_nota);
              return `
                <tr>
                  <td>${fmtDate(r.tanggal)}</td>
                  <td>
                    <div class="fw-medium">${escapeHtml(r.kategori || '-')}</div>
                    <div class="text-secondary small">${escapeHtml(r.jenis_servis || '')}</div>
                  </td>
                  <td class="d-none d-md-table-cell text-secondary">${escapeHtml(r.bengkel || '-')}</td>
                  <td class="text-end">${fmtNum(r.odometer)} km</td>
                  <td class="text-end fw-medium">${fmtRp(r.biaya)}</td>
                  <td class="text-center">
                    ${notes.length ? fileGridHtml('service_records', r.id, notes, 36) : '<span class="text-secondary small">-</span>'}
                  </td>
                  <td class="text-end text-nowrap">
                    <button onclick="goToForm('service', '${r.id}')" class="btn btn-light btn-icon-sm" title="Edit">
                      ${iconHtml('edit')}
                    </button>
                    <button onclick="deleteRecord('service_records','${r.id}')" class="btn btn-light btn-icon-sm" title="Hapus">
                      <i class="${icon('delete')} text-danger"></i>
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    ` : `<div class="empty-state card mx-auto text-center" style="max-width:480px;">
          <div class="card-body p-5">
            <i class="${icon('service')} text-secondary" style="font-size:64px;opacity:0.35;"></i>
            <h3 class="h5 fw-bold mt-3 mb-2">Belum ada catatan servis</h3>
            <p class="text-secondary mb-4">Mulai catat riwayat servis kendaraan Anda.</p>
            <button onclick="goToForm('service')" class="btn btn-primary">Tambah Servis</button>
          </div>
        </div>`}
  `;
}

Object.assign(VT, { renderServices });

})();