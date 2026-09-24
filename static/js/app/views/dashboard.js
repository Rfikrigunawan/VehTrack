/* =====================================================================
   views/dashboard.js — Dashboard + Detail Page
   =====================================================================
   Fungsi:
     - statCard()            → HTML stat card
     - vehicleCardHtml(v)    → HTML vehicle card
     - renderDashboard()     → render halaman dashboard
     - renderDetail()        → render halaman detail kendaraan
     - openVehicleDetail(id), goBackFromDetail()

   Depends:
     - utils/*
     - core/state.js
     - core/router.js
     - shared/files.js
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;
const { state, $, icon, iconHtml, ICONS } = VT;
const {
  fmtRp, fmtNum, fmtDate, daysUntil,
  escapeHtml, escapeStr,
  jenisIcon, vehicleMeta,
  fileUrl,
} = VT;

/* ============================================================
   HELPERS
   ============================================================ */

function statCard(iconName, value, label, tone) {
  return `<div class="col">
    <div class="dash-stat-card tone-${tone}">
      <div class="dash-stat-icon">${iconHtml(iconName)}</div>
      <div class="dash-stat-value">${value}</div>
      <div class="dash-stat-label">${label}</div>
    </div>
  </div>`;
}

function vehicleCardHtml(v) {
  const iconName = jenisIcon(v.jenis);
  const photo = v.foto ? fileUrl('vehicles', v.id, v.foto) : null;

  const photoHtml = photo
    ? `<img src="${photo}" alt="${escapeHtml(v.nama)}" loading="lazy"
             onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'dash-vehicle-photo-placeholder',innerHTML:'<i class=\\'${icon(iconName)}\\'></i>'}))" />`
    : `<div class="dash-vehicle-photo-placeholder">${iconHtml(iconName)}</div>`;

  return `
    <div class="dash-vehicle-card" data-vehicle-id="${v.id}">
      <div class="dash-vehicle-photo">
        ${photoHtml}
        <div class="dash-vehicle-photo-overlay">
          <span class="dash-vehicle-type-badge">${escapeHtml(v.jenis)}</span>
        </div>
      </div>
      <div class="dash-vehicle-body">
        <h3 class="dash-vehicle-name">${escapeHtml(v.nama)}</h3>
        <div class="dash-vehicle-meta">${escapeHtml(vehicleMeta(v))}</div>
        <div class="dash-vehicle-stats">
          <div>
            <div class="dash-vehicle-stat-label">Plat</div>
            <div class="dash-vehicle-stat-value plate">${escapeHtml(v.plat_nomor || '-')}</div>
          </div>
          <div>
            <div class="dash-vehicle-stat-label">Odometer</div>
            <div class="dash-vehicle-stat-value">${fmtNum(v.odometer_terakhir || 0)} km</div>
          </div>
        </div>
      </div>
      <i class="${icon('chevronRight')} dash-vehicle-chevron"></i>
    </div>`;
}

/* ============================================================
   DASHBOARD
   ============================================================ */

function renderDashboard() {
  const content = $('#content');

  /* ---- Empty state ---- */
  if (!state.vehicles.length) {
    content.innerHTML = `
      <div class="dash-view">
        <div class="dash-empty">
          <i class="${icon('car', 'dash-empty-icon')}"></i>
          <h3 class="dash-empty-title">Belum ada kendaraan</h3>
          <p class="dash-empty-text">Tambahkan kendaraan pertama Anda untuk mulai mencatat servis, BBM, dan pengingat.</p>
          <button onclick="goToForm('vehicle')" class="btn btn-primary">
            ${iconHtml('add', 'me-1')} Tambah Kendaraan
          </button>
        </div>
      </div>`;
    return;
  }

  /* ---- Aggregate data ---- */
  const services = state.records.service_records || [];
  const fuels    = state.records.fuel_logs || [];
  const docs     = state.records.documents || [];
  const rems     = state.records.reminders || [];

  const totalService = services.reduce((a, r) => a + (r.biaya || 0), 0);
  const totalFuel    = fuels.reduce((a, r) => a + (r.total_biaya || 0), 0);

  const expiringDocs = docs
    .map((d) => ({ ...d, dd: daysUntil(d.tanggal_kadaluarsa) }))
    .filter((d) => d.dd !== null && d.dd <= 30)
    .sort((a, b) => a.dd - b.dd);

  const activeRems = rems
    .filter((r) => r.status === 'pending')
    .map((r) => {
      const v = state.vehicles.find((x) => x.id === r.vehicle);
      let sortKey = 999, info = '', sev = 'info';

      if (r.tipe === 'km' && v) {
        const sisa = (r.target_km || 0) - (v.odometer_terakhir || 0);
        sortKey = sisa;
        if (sisa < 0)         { info = `Lewat ${fmtNum(Math.abs(sisa))} km`; sev = 'danger'; }
        else if (sisa === 0)  { info = 'Sekarang!'; sev = 'danger'; }
        else if (sisa <= 500) { info = `${fmtNum(sisa)} km`; sev = 'warning'; }
        else                  { info = `${fmtNum(sisa)} km`; }
      } else if (r.tipe === 'tanggal') {
        const dd = daysUntil(r.target_date);
        sortKey = dd === null ? 999 : dd;
        if (dd !== null) {
          if (dd < 0)        { info = `Lewat ${Math.abs(dd)} hari`; sev = 'danger'; }
          else if (dd === 0) { info = 'Hari ini'; sev = 'danger'; }
          else if (dd <= 7)  { info = `${dd} hari`; sev = 'warning'; }
          else               { info = `${dd} hari`; }
        }
      }
      return { ...r, v, info, sev, sortKey };
    })
    .sort((a, b) => a.sortKey - b.sortKey)
    .slice(0, 4);

  const totalAlerts = expiringDocs.length + activeRems.length;
  const alertsBadgeHtml = totalAlerts > 0
    ? `<span class="badge text-bg-danger ms-auto">${totalAlerts}</span>`
    : '';

  /* ---- Alerts body ---- */
  let alertsBodyHtml;
  if (expiringDocs.length || activeRems.length) {
    alertsBodyHtml =
      expiringDocs.slice(0, 2).map((d) => {
        const sev = d.dd < 0 || d.dd <= 7 ? 'danger' : 'warning';
        const label = d.dd < 0
          ? `${escapeHtml(d.jenis)} — kadaluarsa`
          : d.dd === 0
            ? `${escapeHtml(d.jenis)} — hari ini!`
            : `${escapeHtml(d.jenis)} — ${d.dd} hari lagi`;
        return `
          <div class="dash-alert-item sev-${sev}">
            <span class="dash-alert-text">${iconHtml('document', 'me-1')}${label}</span>
            <span class="dash-alert-date">${fmtDate(d.tanggal_kadaluarsa)}</span>
          </div>`;
      }).join('') +
      activeRems.slice(0, 2).map((r) => `
        <div class="dash-alert-item sev-${r.sev}">
          <span class="dash-alert-text">
            ${iconHtml('reminder', 'me-1')}${escapeHtml(r.judul)}${r.v ? ' — ' + escapeHtml(r.v.nama) : ''}
          </span>
          <span class="dash-alert-date">${r.info}</span>
        </div>
      `).join('');
  } else {
    alertsBodyHtml = `
      <div class="text-center text-secondary small py-4">
        <i class="${icon('check', 'text-success d-block mb-2')}" style="font-size:32px;"></i>
        Tidak ada yang perlu perhatian saat ini.
      </div>`;
  }

  /* ---- Main HTML ---- */
  content.innerHTML = `
    <div class="dash-view">
      <div class="row row-cols-2 row-cols-md-4 g-3 mb-4">
        ${statCard('car', state.vehicles.length, 'Kendaraan', 'primary')}
        ${statCard('service', services.length, 'Catatan Servis', 'success')}
        ${statCard('fuel', fuels.length, 'Isi BBM', 'warning')}
        ${statCard('reminder', activeRems.length, 'Pengingat Aktif', 'info')}
      </div>

      <div class="row g-3 mb-4">
        <div class="col-lg-6">
          <div class="dash-panel">
            <h3 class="dash-panel-title">
              ${iconHtml('coins')} Ringkasan Pengeluaran
            </h3>
            <div class="dash-row">
              <span class="dash-row-label">Total Servis</span>
              <span class="dash-row-value">${fmtRp(totalService)}</span>
            </div>
            <div class="dash-row">
              <span class="dash-row-label">Total BBM</span>
              <span class="dash-row-value">${fmtRp(totalFuel)}</span>
            </div>
            <div class="dash-grand-total">
              <span class="dash-grand-total-label">Grand Total</span>
              <span class="dash-grand-total-value">${fmtRp(totalService + totalFuel)}</span>
            </div>
          </div>
        </div>

        <div class="col-lg-6">
          <div class="dash-panel">
            <h3 class="dash-panel-title">
              ${iconHtml('warning')} Perlu Perhatian
              ${alertsBadgeHtml}
            </h3>
            ${alertsBodyHtml}
          </div>
        </div>
      </div>

      <div class="dash-panel">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h3 class="dash-panel-title mb-0">
            ${iconHtml('grid')} Kendaraan Saya
            <span class="badge text-bg-light ms-2">${state.vehicles.length}</span>
          </h3>
          <button onclick="goToForm('vehicle')" class="btn btn-sm btn-light">
            ${iconHtml('add', 'me-1')} Tambah
          </button>
        </div>
        <div class="dash-vehicle-grid">
          ${state.vehicles.map(vehicleCardHtml).join('')}
        </div>
      </div>
    </div>
  `;

  // Event delegation klik card
  content.querySelectorAll('.dash-vehicle-card').forEach((card) => {
    card.addEventListener('click', () => {
      openVehicleDetail(card.getAttribute('data-vehicle-id'));
    });
  });
}

/* ============================================================
   DETAIL PAGE
   ============================================================ */

function openVehicleDetail(id) {
  if (!id) return;
  VT.navigateTo('detail', { detailId: id });
}

function goBackFromDetail() {
  if (history.length > 1 && document.referrer.includes('/app')) {
    history.back();
  } else {
    VT.navigateTo('dashboard');
  }
}

function renderDetail() {
  const content = $('#content');
  const id = state.currentDetailId;
  const v = id ? state.vehicles.find((x) => x.id === id) : null;

  if (!v) {
    content.innerHTML = `
      <div class="dash-view">
        <div class="dash-detail-page">
          <button class="dash-detail-back" onclick="goBackFromDetail()">
            ${iconHtml('back')} Kembali
          </button>
          <div class="dash-empty">
            <i class="${icon('warning', 'dash-empty-icon')}"></i>
            <h3 class="dash-empty-title">Kendaraan tidak ditemukan</h3>
            <p class="dash-empty-text">Kendaraan yang Anda cari mungkin sudah dihapus atau tidak tersedia.</p>
            <button onclick="goBackFromDetail()" class="btn btn-primary">
              ${iconHtml('back', 'me-1')} Kembali ke Dashboard
            </button>
          </div>
        </div>
      </div>`;
    return;
  }

  const iconName = jenisIcon(v.jenis);
  const photo = v.foto ? fileUrl('vehicles', v.id, v.foto) : null;

  // Filter records
  const services = (state.records.service_records || []).filter((r) => r.vehicle === id);
  const fuels    = (state.records.fuel_logs || []).filter((r) => r.vehicle === id);
  const docs     = (state.records.documents || []).filter((r) => r.vehicle === id);
  const rems     = (state.records.reminders || []).filter((r) => r.vehicle === id && r.status === 'pending');

  const totalService = services.reduce((a, r) => a + (r.biaya || 0), 0);
  const totalFuel    = fuels.reduce((a, r) => a + (r.total_biaya || 0), 0);

  const sortDesc = (arr, key) => [...arr].sort((a, b) => (b[key] || '').localeCompare(a[key] || ''));
  const lastService = sortDesc(services, 'tanggal')[0];
  const lastFuel    = sortDesc(fuels, 'tanggal')[0];

  const fuelKonsumsi = fuels.filter((f) => f.konsumsi && f.konsumsi > 0);
  const avgKonsumsi = fuelKonsumsi.length
    ? (fuelKonsumsi.reduce((a, f) => a + f.konsumsi, 0) / fuelKonsumsi.length).toFixed(1)
    : null;

  const expiringDocs = docs
    .map((d) => ({ ...d, dd: daysUntil(d.tanggal_kadaluarsa) }))
    .filter((d) => d.dd !== null && d.dd <= 30)
    .sort((a, b) => a.dd - b.dd);

  const dueReminders = rems.map((r) => {
    let sortKey, info, sev = 'info';
    if (r.tipe === 'km') {
      const sisa = (r.target_km || 0) - (v.odometer_terakhir || 0);
      sortKey = sisa;
      if (sisa < 0)         { info = `Lewat ${fmtNum(Math.abs(sisa))} km`; sev = 'danger'; }
      else if (sisa === 0)  { info = 'Sekarang!'; sev = 'danger'; }
      else if (sisa <= 500) { info = `${fmtNum(sisa)} km lagi`; sev = 'warning'; }
      else                  { info = `${fmtNum(sisa)} km lagi`; }
    } else {
      const dd = daysUntil(r.target_date);
      sortKey = dd === null ? 999 : dd;
      if (dd === null)       { info = '-'; }
      else if (dd < 0)       { info = `Lewat ${Math.abs(dd)} hari`; sev = 'danger'; }
      else if (dd === 0)     { info = 'Hari ini'; sev = 'danger'; }
      else if (dd <= 7)      { info = `${dd} hari lagi`; sev = 'warning'; }
      else                   { info = `${dd} hari lagi`; }
    }
    return { ...r, info, sev, sortKey };
  }).sort((a, b) => a.sortKey - b.sortKey);

  const heroHtml = photo
    ? `<div class="dash-detail-hero">
         <img src="${photo}" alt="${escapeHtml(v.nama)}"
              onclick="openLightbox('${photo}', '${escapeStr(v.nama)}')" />
       </div>`
    : `<div class="dash-detail-hero">
         <div class="dash-detail-hero-placeholder">${iconHtml(iconName)}</div>
       </div>`;

  const infoItemsHtml = [
    { icon: 'cardText',      label: 'Plat Nomor',   value: v.plat_nomor || '-',                        mono: true },
    { icon: 'palette',       label: 'Warna',        value: v.warna || '-',                             mono: false },
    { icon: 'gauge2',        label: 'Odometer',     value: fmtNum(v.odometer_terakhir || 0) + ' km',   mono: false },
    { icon: 'calendarEvent', label: 'Tanggal Beli', value: v.tanggal_beli ? fmtDate(v.tanggal_beli) : '-', mono: false },
    { icon: 'barcode',       label: 'No. Rangka',   value: v.nomor_rangka || '-',                      mono: true },
    { icon: 'microchip',     label: 'No. Mesin',    value: v.nomor_mesin || '-',                       mono: true },
  ].map((it) => `
    <div class="dash-detail-list-item">
      <div class="dash-detail-list-icon">${iconHtml(it.icon)}</div>
      <div class="dash-detail-list-content">
        <div class="dash-detail-list-label">${it.label}</div>
        <div class="dash-detail-list-value ${it.mono ? 'mono' : ''}">${escapeHtml(it.value)}</div>
      </div>
    </div>
  `).join('');

  content.innerHTML = `
    <div class="dash-view">
      <div class="dash-detail-page">

        <div class="dash-detail-hero-wrap">
          <button class="dash-detail-back-floating" onclick="goBackFromDetail()" title="Kembali">
            ${iconHtml('back')}
          </button>

          ${heroHtml}

          <div class="dash-detail-hero-overlay">
            <div class="dash-detail-hero-overlay-main">
              <h1 class="dash-detail-hero-name">${escapeHtml(v.nama)}</h1>
              <div class="dash-detail-hero-meta">
                ${iconHtml(iconName)}
                <span>${escapeHtml(vehicleMeta(v))}</span>
              </div>
            </div>
            <span class="dash-detail-hero-badge">${escapeHtml(v.jenis)}</span>
          </div>
        </div>

        <div class="dash-detail-stats">
          <div class="dash-detail-stat tone-servis">
            <div class="dash-detail-stat-icon">${iconHtml('service')}</div>
            <div>
              <div class="dash-detail-stat-value">${services.length}</div>
              <div class="dash-detail-stat-label">Servis</div>
            </div>
          </div>
          <div class="dash-detail-stat tone-bbm">
            <div class="dash-detail-stat-icon">${iconHtml('fuel')}</div>
            <div>
              <div class="dash-detail-stat-value">${fuels.length}</div>
              <div class="dash-detail-stat-label">Isi BBM</div>
            </div>
          </div>
          <div class="dash-detail-stat tone-dokumen">
            <div class="dash-detail-stat-icon">${iconHtml('document')}</div>
            <div>
              <div class="dash-detail-stat-value">${docs.length}</div>
              <div class="dash-detail-stat-label">Dokumen</div>
            </div>
          </div>
          <div class="dash-detail-stat tone-pengingat">
            <div class="dash-detail-stat-icon">${iconHtml('reminder')}</div>
            <div>
              <div class="dash-detail-stat-value">${rems.length}</div>
              <div class="dash-detail-stat-label">Pengingat</div>
            </div>
          </div>
        </div>

        <div class="dash-detail-list">
          ${infoItemsHtml}
        </div>

        <div class="dash-detail-sections">
          <div class="dash-detail-section">
            <div class="dash-detail-section-header">
              <h4 class="dash-detail-section-title">
                <span class="dash-detail-section-icon tone-money">${iconHtml('coins')}</span>
                Ringkasan Biaya
              </h4>
            </div>
            <div class="dash-row">
              <span class="dash-row-label">${iconHtml('service', 'me-2 text-secondary')}Total Servis</span>
              <span class="dash-row-value">${fmtRp(totalService)}</span>
            </div>
            <div class="dash-row">
              <span class="dash-row-label">${iconHtml('fuel', 'me-2 text-secondary')}Total BBM</span>
              <span class="dash-row-value">${fmtRp(totalFuel)}</span>
            </div>
            ${avgKonsumsi ? `
              <div class="dash-row">
                <span class="dash-row-label">${iconHtml('chartLine', 'me-2 text-secondary')}Rata-rata Konsumsi</span>
                <span class="dash-row-value">${avgKonsumsi} km/L</span>
              </div>
            ` : ''}
            <div class="dash-grand-total">
              <span class="dash-grand-total-label">Total Pengeluaran</span>
              <span class="dash-grand-total-value">${fmtRp(totalService + totalFuel)}</span>
            </div>
          </div>

          <div class="dash-detail-section">
            <div class="dash-detail-section-header">
              <h4 class="dash-detail-section-title">
                <span class="dash-detail-section-icon tone-servis">${iconHtml('service')}</span>
                Servis Terakhir
              </h4>
              <a class="dash-detail-section-link" data-goto="service_records">
                Lihat semua ${iconHtml('forward')}
              </a>
            </div>
            ${lastService ? `
              <div class="dash-detail-item">
                <div class="dash-detail-item-main">
                  <div class="dash-detail-item-title">${escapeHtml(lastService.kategori || 'Servis')}</div>
                  <div class="dash-detail-item-sub">
                    ${fmtDate(lastService.tanggal)}${lastService.bengkel ? ' · ' + escapeHtml(lastService.bengkel) : ''}
                  </div>
                </div>
                <div class="dash-detail-item-value">${fmtRp(lastService.biaya)}</div>
              </div>
            ` : `<div class="dash-detail-empty">${iconHtml('inbox', 'me-2')}Belum ada catatan servis</div>`}
          </div>

          <div class="dash-detail-section">
            <div class="dash-detail-section-header">
              <h4 class="dash-detail-section-title">
                <span class="dash-detail-section-icon tone-bbm">${iconHtml('fuel')}</span>
                Isi BBM Terakhir
              </h4>
              <a class="dash-detail-section-link" data-goto="fuel_logs">
                Lihat semua ${iconHtml('forward')}
              </a>
            </div>
            ${lastFuel ? `
              <div class="dash-detail-item">
                <div class="dash-detail-item-main">
                  <div class="dash-detail-item-title">
                    ${escapeHtml(lastFuel.jenis_bbm || 'BBM')} · ${lastFuel.liter || '-'} L
                  </div>
                  <div class="dash-detail-item-sub">
                    ${fmtDate(lastFuel.tanggal)}${lastFuel.konsumsi ? ` · ${lastFuel.konsumsi} km/L` : ''}
                  </div>
                </div>
                <div class="dash-detail-item-value">${fmtRp(lastFuel.total_biaya)}</div>
              </div>
            ` : `<div class="dash-detail-empty">${iconHtml('inbox', 'me-2')}Belum ada catatan BBM</div>`}
          </div>

          ${expiringDocs.length ? `
            <div class="dash-detail-section">
              <div class="dash-detail-section-header">
                <h4 class="dash-detail-section-title">
                  <span class="dash-detail-section-icon tone-warning">${iconHtml('warning')}</span>
                  Dokumen Perlu Perhatian
                </h4>
                <a class="dash-detail-section-link" data-goto="documents">
                  Lihat semua ${iconHtml('forward')}
                </a>
              </div>
              ${expiringDocs.slice(0, 3).map((d) => {
                const sev = d.dd < 0 || d.dd <= 7 ? 'danger' : 'warning';
                return `
                  <div class="dash-alert-item sev-${sev}">
                    <span class="dash-alert-text">
                      ${iconHtml('document', 'me-1')}
                      ${escapeHtml(d.jenis)} ${d.dd < 0 ? 'KADALUARSA' : d.dd === 0 ? 'HARI INI' : `${d.dd} hari lagi`}
                    </span>
                    <span class="dash-alert-date">${fmtDate(d.tanggal_kadaluarsa)}</span>
                  </div>`;
              }).join('')}
            </div>
          ` : ''}

          ${dueReminders.length ? `
            <div class="dash-detail-section">
              <div class="dash-detail-section-header">
                <h4 class="dash-detail-section-title">
                  <span class="dash-detail-section-icon tone-info">${iconHtml('reminder')}</span>
                  Pengingat Aktif
                </h4>
                <a class="dash-detail-section-link" data-goto="reminders">
                  Lihat semua ${iconHtml('forward')}
                </a>
              </div>
              ${dueReminders.slice(0, 3).map((r) => `
                <div class="dash-alert-item sev-${r.sev}">
                  <span class="dash-alert-text">${iconHtml('reminder', 'me-1')}${escapeHtml(r.judul)}</span>
                  <span class="dash-alert-date">${r.info}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <div class="dash-detail-actions">
          <button class="btn btn-primary btn-sm" onclick="goToForm('vehicle', '${v.id}')">
            ${iconHtml('edit', 'me-1')} Edit Kendaraan
          </button>
          <button class="btn btn-light btn-sm" onclick="goToForm('service')">
            ${iconHtml('service', 'me-1')} Catat Servis
          </button>
          <button class="btn btn-light btn-sm" onclick="goToForm('fuel')">
            ${iconHtml('fuel', 'me-1')} Isi BBM
          </button>
          <button class="btn btn-light btn-sm" onclick="goToForm('document')">
            ${iconHtml('document', 'me-1')} Tambah Dokumen
          </button>
          <button class="btn btn-light btn-sm" onclick="goToForm('reminder')">
            ${iconHtml('reminder', 'me-1')} Tambah Pengingat
          </button>
        </div>

      </div>
    </div>
  `;

  // Handler "Lihat semua"
  content.querySelectorAll('[data-goto]').forEach((el) => {
    el.addEventListener('click', () => {
      const target = el.getAttribute('data-goto');
      state.currentVehicle = v.id;
      const sel = $('#vehicle-select');
      if (sel) sel.value = v.id;
      VT.navigateTo(target);
    });
  });
}

Object.assign(VT, {
  statCard,
  vehicleCardHtml,
  renderDashboard,
  renderDetail,
  openVehicleDetail,
  goBackFromDetail,
});

window.openVehicleDetail = openVehicleDetail;
window.goBackFromDetail = goBackFromDetail;

})();