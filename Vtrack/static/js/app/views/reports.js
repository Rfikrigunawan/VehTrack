/* =====================================================================
   views/reports.js — Halaman Laporan (Reports)
   =====================================================================
   Fungsi:
     - renderReports()            → render halaman laporan lengkap
     - Kumpulan helper untuk agregasi data:
       - aggregateByYear()
       - aggregateByMonth()
       - aggregateByVehicle()
       - getTopServices()
       - getFuelConsumption()

   Isi laporan:
     1. Stat cards: total biaya, servis, BBM, tahun aktif
     2. Filter tahun (dropdown)
     3. Chart batang: pengeluaran per bulan (tahun terpilih)
     4. Chart batang: pengeluaran per tahun (semua tahun)
     5. Analisa per kendaraan (bar horizontal)
     6. Top 5 servis termahal
     7. Konsumsi BBM per kendaraan
     8. Riwayat servis terbaru (timeline)

   Depends:
     - utils/*
     - core/state.js
     - core/router.js
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;
const { state, $, icon, iconHtml } = VT;
const { fmtRp, fmtNum, fmtDate, escapeHtml } = VT;

/* ============================================================
   LOCAL STATE — Filter tahun untuk laporan
   ============================================================ */
let _reportYear = new Date().getFullYear();

/* ============================================================
   HELPER: Parse tahun dari tanggal
   ============================================================ */

function parseYear(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  // Konversi ke WIB dulu
  const wib = new Date(d.getTime() + VT.WIB_OFFSET_MIN * 60 * 1000);
  return wib.getUTCFullYear();
}

function parseMonth(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const wib = new Date(d.getTime() + VT.WIB_OFFSET_MIN * 60 * 1000);
  return wib.getUTCMonth(); // 0-11
}

/* ============================================================
   HELPER: Format tanggal lengkap dengan tahun
   ============================================================ */

const MONTH_LONG = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];

/* ============================================================
   AGGREGATORS
   ============================================================ */

/**
 * Hitung total servis + BBM per tahun.
 * Return: [{ year, serviceTotal, fuelTotal, grandTotal, serviceCount, fuelCount }]
 */
function aggregateByYear() {
  const services = state.records.service_records || [];
  const fuels = state.records.fuel_logs || [];
  const map = {}; // year → { service, fuel, count... }

  services.forEach((r) => {
    const y = parseYear(r.tanggal);
    if (y === null) return;
    if (!map[y]) map[y] = { year: y, serviceTotal: 0, fuelTotal: 0, serviceCount: 0, fuelCount: 0 };
    map[y].serviceTotal += Number(r.biaya) || 0;
    map[y].serviceCount += 1;
  });

  fuels.forEach((r) => {
    const y = parseYear(r.tanggal);
    if (y === null) return;
    if (!map[y]) map[y] = { year: y, serviceTotal: 0, fuelTotal: 0, serviceCount: 0, fuelCount: 0 };
    map[y].fuelTotal += Number(r.total_biaya) || 0;
    map[y].fuelCount += 1;
  });

  return Object.values(map)
    .map((x) => ({ ...x, grandTotal: x.serviceTotal + x.fuelTotal }))
    .sort((a, b) => a.year - b.year);
}

/**
 * Hitung total per bulan untuk tahun tertentu.
 * Return: array 12 bulan: [{ month, serviceTotal, fuelTotal, grandTotal }]
 */
function aggregateByMonth(year) {
  const services = state.records.service_records || [];
  const fuels = state.records.fuel_logs || [];
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i,
    serviceTotal: 0,
    fuelTotal: 0,
    grandTotal: 0,
  }));

  services.forEach((r) => {
    if (parseYear(r.tanggal) !== year) return;
    const m = parseMonth(r.tanggal);
    if (m === null) return;
    months[m].serviceTotal += Number(r.biaya) || 0;
  });

  fuels.forEach((r) => {
    if (parseYear(r.tanggal) !== year) return;
    const m = parseMonth(r.tanggal);
    if (m === null) return;
    months[m].fuelTotal += Number(r.total_biaya) || 0;
  });

  months.forEach((x) => {
    x.grandTotal = x.serviceTotal + x.fuelTotal;
  });

  return months;
}

/**
 * Agregasi per kendaraan.
 * Return: [{ vehicle, serviceTotal, fuelTotal, grandTotal, serviceCount, fuelCount }]
 */
function aggregateByVehicle() {
  const services = state.records.service_records || [];
  const fuels = state.records.fuel_logs || [];
  const map = {}; // vehicleId → {...}

  services.forEach((r) => {
    const vid = r.vehicle;
    if (!vid) return;
    if (!map[vid]) map[vid] = { vehicleId: vid, serviceTotal: 0, fuelTotal: 0, serviceCount: 0, fuelCount: 0 };
    map[vid].serviceTotal += Number(r.biaya) || 0;
    map[vid].serviceCount += 1;
  });

  fuels.forEach((r) => {
    const vid = r.vehicle;
    if (!vid) return;
    if (!map[vid]) map[vid] = { vehicleId: vid, serviceTotal: 0, fuelTotal: 0, serviceCount: 0, fuelCount: 0 };
    map[vid].fuelTotal += Number(r.total_biaya) || 0;
    map[vid].fuelCount += 1;
  });

  return Object.values(map)
    .map((x) => {
      const v = state.vehicles.find((vv) => vv.id === x.vehicleId);
      return {
        ...x,
        vehicle: v,
        name: v ? v.nama : '(Kendaraan dihapus)',
        grandTotal: x.serviceTotal + x.fuelTotal,
      };
    })
    .sort((a, b) => b.grandTotal - a.grandTotal);
}

/**
 * Top N servis termahal.
 */
function getTopServices(limit = 5, year = null) {
  const services = state.records.service_records || [];
  return services
    .filter((r) => year === null || parseYear(r.tanggal) === year)
    .map((r) => {
      const v = state.vehicles.find((vv) => vv.id === r.vehicle);
      return { ...r, vehicleName: v ? v.nama : '(Kendaraan dihapus)' };
    })
    .sort((a, b) => (Number(b.biaya) || 0) - (Number(a.biaya) || 0))
    .slice(0, limit);
}

/**
 * Konsumsi BBM per kendaraan.
 * Return: [{ vehicle, avgKonsumsi, totalLiter, totalBiaya, count }]
 */
function getFuelConsumption() {
  const fuels = state.records.fuel_logs || [];
  const map = {};

  fuels.forEach((r) => {
    const vid = r.vehicle;
    if (!vid) return;
    if (!map[vid]) map[vid] = {
      vehicleId: vid,
      konsumsiList: [],
      totalLiter: 0,
      totalBiaya: 0,
      count: 0,
    };
    if (r.konsumsi && r.konsumsi > 0) {
      map[vid].konsumsiList.push(Number(r.konsumsi));
    }
    map[vid].totalLiter += Number(r.liter) || 0;
    map[vid].totalBiaya += Number(r.total_biaya) || 0;
    map[vid].count += 1;
  });

  return Object.values(map)
    .map((x) => {
      const v = state.vehicles.find((vv) => vv.id === x.vehicleId);
      const avg = x.konsumsiList.length
        ? x.konsumsiList.reduce((a, b) => a + b, 0) / x.konsumsiList.length
        : 0;
      return {
        ...x,
        vehicle: v,
        name: v ? v.nama : '(Kendaraan dihapus)',
        avgKonsumsi: avg,
      };
    })
    .sort((a, b) => b.avgKonsumsi - a.avgKonsumsi);
}

/**
 * Semua servis dalam 12 bulan terakhir (untuk timeline).
 */
function getRecentServices(limit = 10) {
  const services = state.records.service_records || [];
  return services
    .map((r) => {
      const v = state.vehicles.find((vv) => vv.id === r.vehicle);
      return { ...r, vehicleName: v ? v.nama : '(Kendaraan dihapus)' };
    })
    .sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''))
    .slice(0, limit);
}

/* ============================================================
   RENDER HELPERS
   ============================================================ */

/**
 * Render bar chart sederhana pakai CSS (tanpa library).
 * @param {Array} data - [{ label, value }]
 * @param {string} tone - 'primary' | 'success' | 'warning' | 'info' | 'purple'
 * @param {Function} fmtValue - formatter untuk nilai
 */
function barChart(data, tone = 'primary', fmtValue = fmtRp) {
  if (!data.length) {
    return `<div class="report-empty">Belum ada data</div>`;
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return `
    <div class="report-bar-chart">
      ${data.map((d) => {
        const pct = maxValue > 0 ? (d.value / maxValue) * 100 : 0;
        return `
          <div class="report-bar-item">
            <div class="report-bar-label">${escapeHtml(d.label)}</div>
            <div class="report-bar-track">
              <div class="report-bar-fill tone-${tone}" style="width: ${pct}%"></div>
            </div>
            <div class="report-bar-value">${fmtValue(d.value)}</div>
          </div>`;
      }).join('')}
    </div>
  `;
}

/**
 * Stat card khusus laporan (dengan trend indicator).
 */
function reportStatCard(iconName, value, label, tone = 'primary', hint = '') {
  return `
    <div class="col">
      <div class="report-stat-card tone-${tone}">
        <div class="report-stat-icon">${iconHtml(iconName)}</div>
        <div class="report-stat-body">
          <div class="report-stat-value">${value}</div>
          <div class="report-stat-label">${label}</div>
          ${hint ? `<div class="report-stat-hint">${hint}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Empty state khusus laporan.
 */
function reportEmpty(message, iconName = 'chartBar') {
  return `
    <div class="report-empty">
      <i class="${icon(iconName)}"></i>
      <div class="report-empty-text">${escapeHtml(message)}</div>
    </div>
  `;
}

/* ============================================================
   RENDER: LAPORAN LENGKAP
   ============================================================ */

function renderReports() {
  const content = $('#content');
  if (!content) return;

  /* ---- Cek data ---- */
  if (!state.vehicles.length) {
    content.innerHTML = `
      <div class="report-page">
        <div class="report-empty-hero">
          <i class="${icon('chartBar')}"></i>
          <h3>Belum ada data untuk dilaporkan</h3>
          <p>Tambahkan kendaraan dan catat servis / BBM untuk melihat laporan.</p>
          <button onclick="goToForm('vehicle')" class="btn btn-primary">
            ${iconHtml('add', 'me-1')} Tambah Kendaraan
          </button>
        </div>
      </div>
    `;
    return;
  }

  /* ---- Agregasi data ---- */
  const byYear = aggregateByYear();
  const byVehicle = aggregateByVehicle();
  const fuelConsumption = getFuelConsumption();
  const recentServices = getRecentServices(8);

  /* ---- Tentukan tahun terpilih ---- */
  const availableYears = byYear.map((x) => x.year).sort((a, b) => b - a);
  const currentYear = new Date().getFullYear();

  // Kalau tidak ada tahun tersedia, pakai tahun ini
  if (!availableYears.includes(_reportYear)) {
    _reportYear = availableYears[0] || currentYear;
  }

  const byMonth = aggregateByMonth(_reportYear);

  /* ---- Hitung total keseluruhan ---- */
  const totalService = byYear.reduce((a, x) => a + x.serviceTotal, 0);
  const totalFuel = byYear.reduce((a, x) => a + x.fuelTotal, 0);
  const totalGrand = totalService + totalFuel;
  const totalServiceCount = byYear.reduce((a, x) => a + x.serviceCount, 0);
  const totalFuelCount = byYear.reduce((a, x) => a + x.fuelCount, 0);

  /* ---- Data untuk chart ---- */
  // Chart per tahun
  const yearChartData = byYear.map((x) => ({
    label: String(x.year),
    value: x.grandTotal,
  }));

  // Chart per bulan (tahun terpilih)
  const monthChartData = byMonth.map((x) => ({
    label: MONTH_SHORT[x.month],
    value: x.grandTotal,
  }));

  // Chart per kendaraan (top 5)
  const vehicleChartData = byVehicle.slice(0, 5).map((x) => ({
    label: x.name,
    value: x.grandTotal,
  }));

  /* ---- HTML ---- */
  content.innerHTML = `
    <div class="report-page">

      <!-- ============ HEADER: Filter Tahun ============ -->
      <div class="report-header">
        <div class="report-header-info">
          <h2 class="report-title">
            ${iconHtml('chartLine')} Analisis & Laporan
          </h2>
          <p class="report-subtitle">
            Ringkasan lengkap pengeluaran dan aktivitas kendaraan Anda
          </p>
        </div>

        <div class="report-header-actions">
          <div class="report-year-filter">
            <i class="${icon('calendarYear')} report-year-filter-icon"></i>
            <select id="report-year-select" class="report-year-select" aria-label="Filter tahun">
              <option value="all" ${_reportYear === 'all' ? 'selected' : ''}>Semua Tahun</option>
              ${availableYears.map((y) => `
                <option value="${y}" ${_reportYear === y ? 'selected' : ''}>${y}</option>
              `).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- ============ STAT CARDS ============ -->
      <div class="row row-cols-2 row-cols-md-4 g-3 mb-4">
        ${reportStatCard('coins', fmtRp(totalGrand), 'Total Pengeluaran', 'primary',
            `${totalServiceCount + totalFuelCount} transaksi`)}
        ${reportStatCard('service', fmtRp(totalService), 'Total Servis', 'success',
            `${totalServiceCount} kali`)}
        ${reportStatCard('fuel', fmtRp(totalFuel), 'Total BBM', 'warning',
            `${totalFuelCount} kali`)}
        ${reportStatCard('car', String(state.vehicles.length), 'Kendaraan', 'info',
            `${byYear.length} tahun data`)}
      </div>

      <!-- ============ CHART: Pengeluaran per Bulan ============ -->
      <div class="report-panel mb-4">
        <div class="report-panel-header">
          <h3 class="report-panel-title">
            ${iconHtml('chartBar')} Pengeluaran per Bulan — ${_reportYear}
          </h3>
          <div class="report-panel-meta">
            Total: <strong>${fmtRp(byMonth.reduce((a, x) => a + x.grandTotal, 0))}</strong>
          </div>
        </div>
        <div class="report-panel-body">
          ${barChart(monthChartData, 'primary')}
        </div>
      </div>

      <!-- ============ CHART: Pengeluaran per Tahun ============ -->
      <div class="report-panel mb-4">
        <div class="report-panel-header">
          <h3 class="report-panel-title">
            ${iconHtml('chartArea')} Pengeluaran per Tahun
          </h3>
          <div class="report-panel-meta">
            ${byYear.length} tahun
          </div>
        </div>
        <div class="report-panel-body">
          ${byYear.length ? barChart(yearChartData, 'purple') : reportEmpty('Belum ada data tahunan', 'chartArea')}
        </div>
      </div>

      <!-- ============ GRID 2 COL: Analisa Kendaraan + Top Servis ============ -->
      <div class="row g-4 mb-4">
        <div class="col-lg-6">
          <div class="report-panel h-100">
            <div class="report-panel-header">
              <h3 class="report-panel-title">
                ${iconHtml('chartPie')} Pengeluaran per Kendaraan
              </h3>
            </div>
            <div class="report-panel-body">
              ${byVehicle.length
                ? barChart(vehicleChartData, 'success')
                : reportEmpty('Belum ada data kendaraan', 'car')}
            </div>
          </div>
        </div>

        <div class="col-lg-6">
          <div class="report-panel h-100">
            <div class="report-panel-header">
              <h3 class="report-panel-title">
                ${iconHtml('trophy')} Top 5 Servis Termahal
              </h3>
            </div>
            <div class="report-panel-body">
              ${getTopServices(5).length ? `
                <div class="report-top-list">
                  ${getTopServices(5).map((s, i) => `
                    <div class="report-top-item">
                      <div class="report-top-rank rank-${i + 1}">${i + 1}</div>
                      <div class="report-top-body">
                        <div class="report-top-title">${escapeHtml(s.kategori || 'Servis')}</div>
                        <div class="report-top-sub">
                          ${escapeHtml(s.vehicleName)} · ${fmtDate(s.tanggal)}
                        </div>
                      </div>
                      <div class="report-top-value">${fmtRp(s.biaya)}</div>
                    </div>
                  `).join('')}
                </div>
              ` : reportEmpty('Belum ada data servis', 'service')}
            </div>
          </div>
        </div>
      </div>

      <!-- ============ ANALISA KENDARAAN (Tabel) ============ -->
      <div class="report-panel mb-4">
        <div class="report-panel-header">
          <h3 class="report-panel-title">
            ${iconHtml('car')} Analisa per Kendaraan
          </h3>
          <div class="report-panel-meta">
            ${byVehicle.length} kendaraan
          </div>
        </div>
        <div class="report-panel-body p-0">
          ${byVehicle.length ? `
            <div class="report-table-wrap">
              <table class="report-table">
                <thead>
                  <tr>
                    <th>Kendaraan</th>
                    <th class="text-end">Servis</th>
                    <th class="text-end">BBM</th>
                    <th class="text-end">Total</th>
                    <th class="text-end">%</th>
                  </tr>
                </thead>
                <tbody>
                  ${byVehicle.map((x) => {
                    const pct = totalGrand > 0 ? ((x.grandTotal / totalGrand) * 100).toFixed(1) : '0';
                    return `
                      <tr>
                        <td>
                          <div class="report-table-vehicle">
                            <span class="report-table-vehicle-name">${escapeHtml(x.name)}</span>
                            ${x.vehicle ? `<span class="report-table-vehicle-plate">${escapeHtml(x.vehicle.plat_nomor || '-')}</span>` : ''}
                          </div>
                        </td>
                        <td class="text-end">
                          <div>${fmtRp(x.serviceTotal)}</div>
                          <div class="report-table-sub">${x.serviceCount} kali</div>
                        </td>
                        <td class="text-end">
                          <div>${fmtRp(x.fuelTotal)}</div>
                          <div class="report-table-sub">${x.fuelCount} kali</div>
                        </td>
                        <td class="text-end fw-bold">${fmtRp(x.grandTotal)}</td>
                        <td class="text-end">
                          <span class="report-badge">${pct}%</span>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          ` : reportEmpty('Belum ada data', 'car')}
        </div>
      </div>

      <!-- ============ KONSUMSI BBM ============ -->
      <div class="report-panel mb-4">
        <div class="report-panel-header">
          <h3 class="report-panel-title">
            ${iconHtml('fuel')} Konsumsi BBM Rata-rata
          </h3>
        </div>
        <div class="report-panel-body">
          ${fuelConsumption.length ? `
            <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
              ${fuelConsumption.map((x) => {
                let tone = 'warning';
                let label = 'Normal';
                if (x.avgKonsumsi >= 40) { tone = 'success'; label = 'Sangat Efisien'; }
                else if (x.avgKonsumsi >= 25) { tone = 'info'; label = 'Efisien'; }
                else if (x.avgKonsumsi >= 15) { tone = 'warning'; label = 'Normal'; }
                else if (x.avgKonsumsi > 0) { tone = 'danger'; label = 'Boros'; }
                else { tone = 'neutral'; label = 'Belum Ada Data'; }

                return `
                  <div class="col">
                    <div class="report-fuel-card tone-${tone}">
                      <div class="report-fuel-header">
                        <span class="report-fuel-name">${escapeHtml(x.name)}</span>
                        <span class="report-badge tone-${tone}">${label}</span>
                      </div>
                      <div class="report-fuel-body">
                        <div class="report-fuel-value">
                          ${x.avgKonsumsi > 0 ? x.avgKonsumsi.toFixed(2) : '—'}
                          ${x.avgKonsumsi > 0 ? '<span class="report-fuel-unit">km/L</span>' : ''}
                        </div>
                        <div class="report-fuel-meta">
                          ${x.count} pengisian · ${fmtNum(x.totalLiter)} L
                        </div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : reportEmpty('Belum ada data konsumsi BBM', 'fuel')}
        </div>
      </div>

      <!-- ============ TIMELINE: Riwayat Servis Terbaru ============ -->
      <div class="report-panel">
        <div class="report-panel-header">
          <h3 class="report-panel-title">
            ${iconHtml('clock')} Riwayat Servis Terbaru
          </h3>
          <a class="report-panel-link" data-goto="service_records">
            Lihat semua ${iconHtml('arrowRight')}
          </a>
        </div>
        <div class="report-panel-body">
          ${recentServices.length ? `
            <div class="report-timeline">
              ${recentServices.map((s) => `
                <div class="report-timeline-item">
                  <div class="report-timeline-dot"></div>
                  <div class="report-timeline-content">
                    <div class="report-timeline-header">
                      <div class="report-timeline-title">${escapeHtml(s.kategori || 'Servis')}</div>
                      <div class="report-timeline-date">${fmtDate(s.tanggal)}</div>
                    </div>
                    <div class="report-timeline-sub">
                      ${escapeHtml(s.vehicleName)}
                      ${s.bengkel ? ` · ${escapeHtml(s.bengkel)}` : ''}
                    </div>
                  </div>
                  <div class="report-timeline-value">${fmtRp(s.biaya)}</div>
                </div>
              `).join('')}
            </div>
          ` : reportEmpty('Belum ada riwayat servis', 'service')}
        </div>
      </div>

    </div>
  `;

  /* ---- Attach event listeners ---- */
  attachReportEvents();
}

/* ============================================================
   EVENT LISTENERS
   ============================================================ */

function attachReportEvents() {
  // Filter tahun
  const yearSelect = $('#report-year-select');
  if (yearSelect) {
    yearSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      _reportYear = val === 'all' ? 'all' : Number(val);
      renderReports();
    });
  }

  // Navigate links
  document.querySelectorAll('[data-goto]').forEach((el) => {
    el.addEventListener('click', () => {
      const target = el.getAttribute('data-goto');
      VT.navigateTo(target);
    });
  });
}

/* ============================================================
   EXPOSE
   ============================================================ */
Object.assign(VT, {
  renderReports,
  // Helper untuk di-test / reuse
  aggregateByYear,
  aggregateByMonth,
  aggregateByVehicle,
  getTopServices,
  getFuelConsumption,
  getRecentServices,
});

console.log('[app] views/reports loaded');

})();