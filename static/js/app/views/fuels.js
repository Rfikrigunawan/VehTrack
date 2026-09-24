/* =====================================================================
   views/fuels.js — Halaman List BBM + Summary Cards
   =====================================================================
   Fungsi:
     - renderFuels()

   Depends:
     - utils/*
     - core/state.js
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;
const { state, $, icon, iconHtml } = VT;
const { fmtDate, fmtNum, fmtRp, escapeHtml } = VT;

function renderFuels() {
  const content = $('#content');
  const items = state.records.fuel_logs || [];

  /* ---- Hitung ringkasan ---- */
  const totalBiaya = items.reduce((a, r) => a + (r.total_biaya || 0), 0);
  const totalLiter = items.reduce((a, r) => a + (r.liter || 0), 0);
  const count = items.length;
  const avgPerFill = count > 0 ? (totalLiter / count) : 0;
  const withKonsumsi = items.filter((r) => r.konsumsi && r.konsumsi > 0);
  const avgKonsumsi = withKonsumsi.length
    ? (withKonsumsi.reduce((a, r) => a + r.konsumsi, 0) / withKonsumsi.length)
    : 0;
  const avgHargaPerLiter = totalLiter > 0 ? (totalBiaya / totalLiter) : 0;
  const costPerKm = avgKonsumsi > 0 ? (avgHargaPerLiter / avgKonsumsi) : 0;

  const fmtCost = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
  const fmtNumber = (n, dec = 2) => Number(n).toLocaleString('id-ID', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });

  /* ---- Summary cards ---- */
  const summaryHtml = items.length ? `
    <div class="fuel-summary">
      <div class="fuel-summary-card tone-money">
        <div class="fuel-summary-icon">${iconHtml('cashStack')}</div>
        <div class="fuel-summary-body">
          <div class="fuel-summary-label">Total Biaya</div>
          <div class="fuel-summary-value">${fmtCost(totalBiaya)}</div>
          <div class="fuel-summary-sub">${count} pengisian</div>
        </div>
      </div>

      <div class="fuel-summary-card tone-liter">
        <div class="fuel-summary-icon">${iconHtml('dropletHalf')}</div>
        <div class="fuel-summary-body">
          <div class="fuel-summary-label">Total Liter</div>
          <div class="fuel-summary-value">${fmtNumber(totalLiter)} L</div>
          <div class="fuel-summary-sub">Rata-rata: ${fmtNumber(avgPerFill)} L/isi</div>
        </div>
      </div>

      <div class="fuel-summary-card tone-konsumsi">
        <div class="fuel-summary-icon">${iconHtml('gauge')}</div>
        <div class="fuel-summary-body">
          <div class="fuel-summary-label">Konsumsi Rata-rata</div>
          <div class="fuel-summary-value">
            ${avgKonsumsi > 0 ? fmtNumber(avgKonsumsi, 2) + ' km/L' : '—'}
          </div>
          <div class="fuel-summary-sub">
            ${avgKonsumsi > 0
              ? `${withKonsumsi.length} pair terhitung`
              : 'Butuh ≥2 full tank'}
          </div>
        </div>
      </div>

      <div class="fuel-summary-card tone-cost">
        <div class="fuel-summary-icon">${iconHtml('signpost')}</div>
        <div class="fuel-summary-body">
          <div class="fuel-summary-label">Biaya per KM</div>
          <div class="fuel-summary-value">
            ${costPerKm > 0 ? fmtCost(costPerKm) + '/km' : '—'}
          </div>
          <div class="fuel-summary-sub">
            ${avgHargaPerLiter > 0
              ? `≈ ${fmtCost(avgHargaPerLiter)}/L ÷ ${fmtNumber(avgKonsumsi, 2)} km/L`
              : 'Butuh data konsumsi'}
          </div>
        </div>
      </div>
    </div>
  ` : '';

  content.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3 gap-3 flex-wrap">
      <div class="text-secondary small">${items.length} catatan</div>
      <button onclick="goToForm('fuel')" class="btn btn-primary btn-sm">
        ${iconHtml('add', 'me-1')} Isi BBM
      </button>
    </div>
    ${summaryHtml}
    ${items.length ? `
      <div class="table-wrap">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Jenis</th>
              <th class="text-end">Odometer</th>
              <th class="text-end">Liter</th>
              <th class="text-end">Konsumsi</th>
              <th class="text-end">Total</th>
              <th class="text-end"></th>
            </tr>
          </thead>
          <tbody>
            ${items.map((r) => `
              <tr>
                <td>${fmtDate(r.tanggal)}</td>
                <td>
                  <div class="fw-medium">${escapeHtml(r.jenis_bbm || '-')}</div>
                  <div class="text-secondary small">${escapeHtml(r.spbu || '')}</div>
                </td>
                <td class="text-end">${fmtNum(r.odometer)}</td>
                <td class="text-end">${r.liter || '-'} L</td>
                <td class="text-end">
                  ${r.konsumsi ? `<span class="text-success fw-medium">${r.konsumsi} km/L</span>` : '-'}
                </td>
                <td class="text-end fw-medium">${fmtRp(r.total_biaya)}</td>
                <td class="text-end text-nowrap">
                  <button onclick="goToForm('fuel', '${r.id}')" class="btn btn-light btn-icon-sm" title="Edit">
                    ${iconHtml('edit')}
                  </button>
                  <button onclick="deleteRecord('fuel_logs','${r.id}')" class="btn btn-light btn-icon-sm" title="Hapus">
                    <i class="${icon('delete')} text-danger"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : `<div class="empty-state card mx-auto text-center" style="max-width:480px;">
          <div class="card-body p-5">
            <i class="${icon('fuel')} text-secondary" style="font-size:64px;opacity:0.35;"></i>
            <h3 class="h5 fw-bold mt-3 mb-2">Belum ada catatan BBM</h3>
            <p class="text-secondary mb-4">Mulai catat pengisian BBM kendaraan Anda.</p>
            <button onclick="goToForm('fuel')" class="btn btn-primary">Isi BBM</button>
          </div>
        </div>`}
  `;
}

Object.assign(VT, { renderFuels });

})();