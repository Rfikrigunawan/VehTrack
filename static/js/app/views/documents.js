/* =====================================================================
   views/documents.js — Halaman List Dokumen
   =====================================================================
   Fungsi:
     - renderDocuments()

   Depends:
     - utils/*
     - core/state.js
     - shared/files.js
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;
const { state, $, icon, iconHtml } = VT;
const { fmtDate, fmtRp, escapeHtml, daysUntil, normalizeFiles, fileGridHtml } = VT;

function renderDocuments() {
  const content = $('#content');
  const items = state.records.documents || [];

  content.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3 gap-3 flex-wrap">
      <div class="text-secondary small">${items.length} dokumen</div>
      <button onclick="goToForm('document')" class="btn btn-primary btn-sm">
        ${iconHtml('add', 'me-1')} Tambah Dokumen
      </button>
    </div>
    ${items.length ? `
      <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3">
        ${items.map((d) => {
          const dd = daysUntil(d.tanggal_kadaluarsa);
          let badgeCls = 'bg-neutral-soft', statusLabel = 'Tidak ada kadaluarsa';
          if (dd != null) {
            if (dd < 0)        { badgeCls = 'bg-danger-soft';  statusLabel = `Kadaluarsa ${Math.abs(dd)} hari lalu`; }
            else if (dd <= 7)  { badgeCls = 'bg-danger-soft';  statusLabel = `${dd} hari lagi!`; }
            else if (dd <= 30) { badgeCls = 'bg-warning-soft'; statusLabel = `${dd} hari lagi`; }
            else               { badgeCls = 'bg-success-soft'; statusLabel = `Valid (${dd} hari)`; }
          }
          const docs = normalizeFiles(d.foto_dokumen);
          return `
            <div class="col">
              <div class="card card-hover h-100">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-start mb-2 gap-2">
                    <div class="min-w-0">
                      <div class="text-uppercase text-secondary fw-semibold" style="font-size:10px;">${escapeHtml(d.jenis || 'Dokumen')}</div>
                      <div class="fw-bold text-truncate">${escapeHtml(d.nomor || '-')}</div>
                    </div>
                    <div class="d-flex gap-1 flex-shrink-0">
                      <button onclick="goToForm('document', '${d.id}')" class="btn btn-light btn-icon-sm" title="Edit">
                        ${iconHtml('edit')}
                      </button>
                      <button onclick="deleteRecord('documents','${d.id}')" class="btn btn-light btn-icon-sm" title="Hapus">
                        <i class="${icon('delete')} text-danger"></i>
                      </button>
                    </div>
                  </div>
                  <div class="small mb-2">
                    <div class="d-flex justify-content-between py-1"><span class="text-secondary">Terbit</span><span>${fmtDate(d.tanggal_terbit)}</span></div>
                    <div class="d-flex justify-content-between py-1"><span class="text-secondary">Kadaluarsa</span><span>${fmtDate(d.tanggal_kadaluarsa)}</span></div>
                    <div class="d-flex justify-content-between py-1"><span class="text-secondary">Biaya</span><span>${fmtRp(d.biaya)}</span></div>
                  </div>
                  ${docs.length ? `
                    <div class="border-top pt-2 mb-2">
                      <div class="text-secondary mb-2" style="font-size:10px;text-transform:uppercase;font-weight:600;">Lampiran</div>
                      ${fileGridHtml('documents', d.id, docs, 48)}
                    </div>
                  ` : ''}
                  <div class="badge-status ${badgeCls} w-100 text-center mt-2">${statusLabel}</div>
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>
    ` : `<div class="empty-state card mx-auto text-center" style="max-width:480px;">
          <div class="card-body p-5">
            <i class="${icon('document')} text-secondary" style="font-size:64px;opacity:0.35;"></i>
            <h3 class="h5 fw-bold mt-3 mb-2">Belum ada dokumen</h3>
            <p class="text-secondary mb-4">Tambahkan STNK, pajak, asuransi, atau KIR.</p>
            <button onclick="goToForm('document')" class="btn btn-primary">Tambah Dokumen</button>
          </div>
        </div>`}
  `;
}

Object.assign(VT, { renderDocuments });

})();