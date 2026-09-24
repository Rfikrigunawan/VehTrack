/* =====================================================================
   form/definitions.js — Form Definitions (Per Entity)
   =====================================================================
   Fungsi:
     Setiap form didefinisikan sebagai factory function yang return:
       { html, submit }
     - html   → string HTML form
     - submit → async function(fd) untuk handle submit

   Forms:
     - vehicle  (tambah/edit kendaraan)
     - service  (tambah/edit servis)
     - fuel     (tambah/edit BBM)
     - document (tambah/edit dokumen)
     - reminder (tambah/edit pengingat)

   Depends:
     - utils/*
     - core/state.js
     - core/api.js
     - shared/files.js
     - form/builders.js
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;
const { state, api, toast, icon, iconHtml, escapeHtml } = VT;
const {
  toPBDate, fromPBDate, todayWIBMidnight,
  fileUrl, normalizeFiles,
} = VT;
const {
  formSection, field, selectField, vehicleSelectField,
  checkboxField, fileField,
  existingPhotoPreview, existingFilesPreview,
} = VT;

/* ============================================================
   HELPERS
   ============================================================ */

/** Refresh setelah submit — dengan retry kecil. */
async function refreshAfterWrite() {
  if (typeof VT.reloadAfterWrite === 'function') {
    await VT.reloadAfterWrite({ delayMs: 300, retries: 1 });
  } else {
    await new Promise((r) => setTimeout(r, 300));
    await VT.reloadAll();
  }
}

/** Navigate yang aman. */
function safeNavigate(view, opts = {}) {
  if (typeof VT.navigateTo === 'function') {
    VT.navigateTo(view, opts);
  } else if (typeof window.navigateTo === 'function') {
    window.navigateTo(view, opts);
  } else {
    window.location.href = `/app/${view}`;
  }
}

/* ============================================================
   FORMS
   ============================================================ */

const FORMS = {

  /* ---------- VEHICLE ---------- */
  vehicle(id) {
    const v = id ? state.vehicles.find((x) => x.id === id) : {};
    const existingPhoto = v.foto ? fileUrl('vehicles', v.id, v.foto) : null;

    const html =
      formSection('Informasi Dasar', 'info', `
        ${field('nama', 'Nama Panggilan', 'text', v.nama, true, 'Contoh: Avanza Putih',
            null, { icon: 'tag' })}
        <div class="row g-3">
          <div class="col-12 col-sm-6">
            ${selectField('jenis', 'Jenis Kendaraan', [
              { value: 'motor', label: 'Motor' },
              { value: 'mobil', label: 'Mobil' },
              { value: 'lainnya', label: 'Lainnya' },
            ], v.jenis, true, { icon: 'grid' })}
          </div>
          <div class="col-12 col-sm-6">
            ${field('tahun', 'Tahun', 'number', v.tahun, false, '2020', null, { icon: 'calendar' })}
          </div>
        </div>
        <div class="row g-3">
          <div class="col-12 col-sm-6">
            ${field('merek', 'Merek', 'text', v.merek, false, 'Toyota', null, { icon: 'award' })}
          </div>
          <div class="col-12 col-sm-6">
            ${field('model', 'Model', 'text', v.model, false, 'Avanza', null, { icon: 'box' })}
          </div>
        </div>
      `, 'primary') +
      formSection('Identifikasi', 'cardText', `
        <div class="row g-3">
          <div class="col-12 col-sm-6">
            ${field('plat_nomor', 'Plat Nomor', 'text', v.plat_nomor, false, 'B 1234 XYZ', null, { icon: 'hash' })}
          </div>
          <div class="col-12 col-sm-6">
            ${field('warna', 'Warna', 'text', v.warna, false, 'Putih', null, { icon: 'palette' })}
          </div>
        </div>
        <div class="row g-3">
          <div class="col-12 col-sm-6">
            ${field('nomor_rangka', 'No. Rangka (VIN)', 'text', v.nomor_rangka, false, '', null, { icon: 'barcode' })}
          </div>
          <div class="col-12 col-sm-6">
            ${field('nomor_mesin', 'No. Mesin', 'text', v.nomor_mesin, false, '', null, { icon: 'microchip' })}
          </div>
        </div>
      `, 'info') +
      formSection('Data Penggunaan', 'gauge2', `
        <div class="row g-3">
          <div class="col-12 col-sm-6">
            ${field('odometer_terakhir', 'Odometer Saat Ini', 'number', v.odometer_terakhir, false, '0',
                null, { icon: 'gauge2', addon: 'km' })}
          </div>
          <div class="col-12 col-sm-6">
            ${field('tanggal_beli', 'Tanggal Pembelian', 'date', fromPBDate(v.tanggal_beli), false, '', null,
                { icon: 'calendarCheck' })}
          </div>
        </div>
        ${existingPhoto ? existingPhotoPreview(existingPhoto, v.nama) : ''}
        ${fileField('foto', existingPhoto ? 'Ganti Foto (opsional)' : 'Foto Kendaraan',
            'Format: JPG, PNG, WebP')}
        ${field('catatan', 'Catatan Tambahan', 'textarea', v.catatan, false,
            'Contoh: Servis rutin tiap 6 bulan', null, { icon: 'comment' })}
      `, 'purple');

    async function submit(fd) {
      const tgl = fd.get('tanggal_beli');
      if (tgl) fd.set('tanggal_beli', toPBDate(tgl));
      else fd.delete('tanggal_beli');

      const fotoVal = fd.get('foto');
      if (!fotoVal || (fotoVal instanceof File && !fotoVal.name)) fd.delete('foto');

      if (id) await api(`/api/vehicles/${id}`, { method: 'PATCH', body: fd });
      else    await api(`/api/vehicles`, { method: 'POST', body: fd });
      toast(id ? 'Kendaraan diperbarui' : 'Kendaraan ditambahkan');

      if (state.view === 'form') safeNavigate('vehicles');
      else await refreshAfterWrite();
    }

    return { html, submit };
  },

  /* ---------- SERVICE ---------- */
  service(id) {
    const r = id ? state.records.service_records.find((x) => x.id === id) : {};
    const existingNotes = normalizeFiles(r.foto_nota);

    const html =
      formSection('Info Servis', 'service', `
        ${vehicleSelectField(r.vehicle)}
        <div class="row g-3">
          <div class="col-12 col-sm-6">
            ${field('tanggal', 'Tanggal Servis', 'date',
                fromPBDate(r.tanggal) || todayWIBMidnight(), true, '', null,
                { icon: 'calendarEvent' })}
          </div>
          <div class="col-12 col-sm-6">
            ${field('odometer', 'Odometer', 'number', r.odometer, false, '', null,
                { icon: 'gauge2', addon: 'km',
                  hint: 'Terisi otomatis dari kendaraan terpilih' })}
          </div>
        </div>
        <div class="row g-3">
          <div class="col-12 col-sm-6">
            ${selectField('jenis_servis', 'Jenis Servis', [
              { value: 'rutin', label: 'Servis Rutin' },
              { value: 'perbaikan', label: 'Perbaikan' },
              { value: 'ganti_part', label: 'Ganti Part' },
            ], r.jenis_servis, false, { icon: 'tools' })}
          </div>
          <div class="col-12 col-sm-6">
            ${field('kategori', 'Kategori', 'text', r.kategori, false, 'Ganti Oli', null, { icon: 'bookmark' })}
          </div>
        </div>
        ${field('deskripsi', 'Deskripsi Pekerjaan', 'textarea', r.deskripsi, false,
            'Detail pekerjaan yang dilakukan', null, { icon: 'comment' })}
        ${field('bengkel', 'Bengkel', 'text', r.bengkel, false, 'Auto2000 Pasteur', null, { icon: 'shop' })}
      `, 'success') +
      formSection('Biaya & Jadwal Berikutnya', 'coins', `
        <div class="row g-3">
          <div class="col-12 col-sm-6">
            ${field('biaya', 'Total Biaya', 'number', r.biaya, false, '0', null, { icon: 'cash', addon: 'Rp' })}
          </div>
          <div class="col-12 col-sm-6">
            ${field('next_service_km', 'Servis Berikutnya (KM)', 'number', r.next_service_km,
                false, '', null, { icon: 'gauge', addon: 'km' })}
          </div>
        </div>
        ${field('next_service_date', 'Tanggal Servis Berikutnya', 'date',
            fromPBDate(r.next_service_date), false, '', null,
            { icon: 'calendarPlus' })}
      `, 'warning') +
      formSection('Lampiran', 'paperclip', `
        ${existingFilesPreview('service_records', r.id, existingNotes, 'Nota saat ini')}
        ${fileField('foto_nota', existingNotes.length ? 'Tambah Nota Baru (opsional)' : 'Foto Nota',
            'Format: JPG, PNG, PDF')}
      `, 'info');

    async function submit(fd) {
      const tgl = fd.get('tanggal');
      if (tgl) fd.set('tanggal', toPBDate(tgl));
      const nsd = fd.get('next_service_date');
      if (nsd) fd.set('next_service_date', toPBDate(nsd));
      else fd.delete('next_service_date');

      const notas = fd.get('foto_nota');
      if (!notas || (notas instanceof File && !notas.name)) fd.delete('foto_nota');

      if (id) await api(`/api/records/service_records/${id}`, { method: 'PATCH', body: fd });
      else    await api(`/api/records/service_records`, { method: 'POST', body: fd });
      toast(id ? 'Servis diperbarui' : 'Servis ditambahkan');

      const vehicleId = fd.get('vehicle');
      if (vehicleId) {
        state.currentVehicle = vehicleId;
        const sel = document.querySelector('#vehicle-select');
        if (sel) sel.value = vehicleId;
      }

      if (state.view === 'form') safeNavigate('service_records');
      else await refreshAfterWrite();
    }

    return { html, submit };
  },

  /* ---------- FUEL ---------- */
  fuel(id) {
    const r = id ? state.records.fuel_logs.find((x) => x.id === id) : {};

    const html =
      formSection('Info Pengisian', 'fuel', `
        ${vehicleSelectField(r.vehicle)}
        <div class="row g-3">
          <div class="col-12 col-sm-6">
            ${field('tanggal', 'Tanggal Isi', 'date',
                fromPBDate(r.tanggal) || todayWIBMidnight(), true, '', null,
                { icon: 'calendarEvent' })}
          </div>
          <div class="col-12 col-sm-6">
            ${field('odometer', 'Odometer', 'number', r.odometer, true, '', null,
                { icon: 'gauge2', addon: 'km',
                  hint: 'Terisi otomatis dari kendaraan terpilih' })}
          </div>
        </div>
        <div class="row g-3">
          <div class="col-12 col-sm-6">
            ${selectField('jenis_bbm', 'Jenis BBM', [
              'Pertalite', 'Pertamax', 'Pertamax Turbo',
              'Pertamina Dex', 'Solar', 'Shell', 'Listrik',
            ], r.jenis_bbm, false, { icon: 'droplet' })}
          </div>
          <div class="col-12 col-sm-6">
            ${field('spbu', 'SPBU', 'text', r.spbu, false, 'Pertamina Pasteur', null, { icon: 'location' })}
          </div>
        </div>
      `, 'warning') +
      formSection('Volume & Biaya', 'coins', `
        <div class="autocalc-hint">
          ${iconHtml('lightning')}
          <span>Isi <b>2 field</b> — field ke-3 akan terhitung otomatis</span>
        </div>
        <div class="row g-3">
          <div class="col-12 col-sm-4">
            ${field('liter', 'Volume', 'number', r.liter, false, '0', '0.01',
                { icon: 'dropletHalf', addon: 'L' })}
          </div>
          <div class="col-12 col-sm-4">
            ${field('harga_per_liter', 'Harga / Liter', 'number', r.harga_per_liter,
                false, '0', null, { icon: 'tag', addon: 'Rp' })}
          </div>
          <div class="col-12 col-sm-4">
            ${field('total_biaya', 'Total Bayar', 'number', r.total_biaya,
                false, '0', null, { icon: 'cashStack', addon: 'Rp' })}
          </div>
        </div>
        ${checkboxField('full_tank', 'Full Tank', r.full_tank !== false,
            'Aktifkan untuk menghitung konsumsi km/L otomatis')}
      `, 'success');

    async function submit(fd) {
      const tgl = fd.get('tanggal');
      if (tgl) fd.set('tanggal', toPBDate(tgl));
      fd.set('full_tank', fd.get('full_tank') ? 'true' : 'false');

      if (id) await api(`/api/records/fuel_logs/${id}`, { method: 'PATCH', body: fd });
      else    await api(`/api/records/fuel_logs`, { method: 'POST', body: fd });
      toast(id ? 'BBM diperbarui' : 'BBM dicatat');

      const vehicleId = fd.get('vehicle');
      if (vehicleId) {
        state.currentVehicle = vehicleId;
        const sel = document.querySelector('#vehicle-select');
        if (sel) sel.value = vehicleId;
      }

      if (state.view === 'form') safeNavigate('fuel_logs');
      else await refreshAfterWrite();
    }

    return { html, submit };
  },

  /* ---------- DOCUMENT ---------- */
  document(id) {
    const d = id ? state.records.documents.find((x) => x.id === id) : {};
    const existingDocs = normalizeFiles(d.foto_dokumen);

    const html =
      formSection('Info Dokumen', 'document', `
        ${vehicleSelectField(d.vehicle)}
        <div class="row g-3">
          <div class="col-12 col-sm-6">
            ${selectField('jenis', 'Jenis Dokumen', ['STNK', 'Pajak', 'Asuransi', 'KIR'],
                d.jenis, true, { icon: 'file' })}
          </div>
          <div class="col-12 col-sm-6">
            ${field('nomor', 'Nomor Dokumen', 'text', d.nomor, false, '1234567890', null, { icon: 'hash' })}
          </div>
        </div>
      `, 'info') +
      formSection('Masa Berlaku', 'calendarCheck', `
        <div class="row g-3">
          <div class="col-12 col-sm-6">
            ${field('tanggal_terbit', 'Tanggal Terbit', 'date',
                fromPBDate(d.tanggal_terbit), false, '', null,
                { icon: 'calendarEvent' })}
          </div>
          <div class="col-12 col-sm-6">
            ${field('tanggal_kadaluarsa', 'Tanggal Kadaluarsa', 'date',
                fromPBDate(d.tanggal_kadaluarsa), false, '', null,
                { icon: 'calendarX',
                  hint: 'Akan di-highlight otomatis jika mendekati' })}
          </div>
        </div>
        ${field('biaya', 'Biaya Perpanjangan', 'number', d.biaya, false, '0',
            null, { icon: 'cash', addon: 'Rp' })}
      `, 'warning') +
      formSection('Lampiran & Catatan', 'paperclip', `
        ${existingFilesPreview('documents', d.id, existingDocs, 'Lampiran saat ini')}
        ${fileField('foto_dokumen', existingDocs.length ? 'Tambah Lampiran Baru (opsional)' : 'Foto/Scan Dokumen',
            'Format: JPG, PNG, PDF')}
        ${field('catatan', 'Catatan', 'textarea', d.catatan, false,
            'Contoh: STNK asli disimpan di dashboard mobil', null, { icon: 'comment' })}
      `, 'purple');

    async function submit(fd) {
      const tt = fd.get('tanggal_terbit');
      if (tt) fd.set('tanggal_terbit', toPBDate(tt));
      else fd.delete('tanggal_terbit');
      const tk = fd.get('tanggal_kadaluarsa');
      if (tk) fd.set('tanggal_kadaluarsa', toPBDate(tk));
      else fd.delete('tanggal_kadaluarsa');

      const docs = fd.get('foto_dokumen');
      if (!docs || (docs instanceof File && !docs.name)) fd.delete('foto_dokumen');

      if (id) await api(`/api/records/documents/${id}`, { method: 'PATCH', body: fd });
      else    await api(`/api/records/documents`, { method: 'POST', body: fd });
      toast(id ? 'Dokumen diperbarui' : 'Dokumen ditambahkan');

      const vehicleId = fd.get('vehicle');
      if (vehicleId) {
        state.currentVehicle = vehicleId;
        const sel = document.querySelector('#vehicle-select');
        if (sel) sel.value = vehicleId;
      }

      if (state.view === 'form') safeNavigate('documents');
      else await refreshAfterWrite();
    }

    return { html, submit };
  },

  /* ---------- REMINDER ---------- */
  reminder(id) {
    const r = id
      ? state.records.reminders.find((x) => x.id === id)
      : { status: 'pending', tipe: 'km' };

    const html =
      formSection('Info Pengingat', 'reminder', `
        ${vehicleSelectField(r.vehicle)}
        ${field('judul', 'Judul Pengingat', 'text', r.judul, true, 'Contoh: Ganti Oli Mesin',
            null, { icon: 'heading' })}
        ${selectField('tipe', 'Tipe Pengingat', [
          { value: 'km', label: 'Berdasarkan KM' },
          { value: 'tanggal', label: 'Berdasarkan Tanggal' },
        ], r.tipe, true, {
          icon: 'sliders',
          hint: 'Pilih KM untuk servis rutin, Tanggal untuk pajak/asuransi',
        })}
      `, 'info') +
      formSection('Target Pengingat', 'bullseye', `
        <div class="row g-3">
          <div class="col-12 col-sm-6">
            ${field('target_km', 'Target Odometer', 'number', r.target_km, false, '', null,
                { icon: 'gauge2', addon: 'km',
                  hint: 'Isi jika tipe = Berdasarkan KM' })}
          </div>
          <div class="col-12 col-sm-6">
            ${field('target_date', 'Target Tanggal', 'date',
                fromPBDate(r.target_date), false, '', null,
                { icon: 'calendarCheck',
                  hint: 'Isi jika tipe = Berdasarkan Tanggal' })}
          </div>
        </div>
        ${selectField('status', 'Status', [
          { value: 'pending', label: 'Aktif' },
          { value: 'done', label: 'Selesai' },
          { value: 'skip', label: 'Dilewati' },
        ], r.status, true, { icon: 'toggleOn' })}
      `, 'success');

    async function submit(fd) {
      const td = fd.get('target_date');
      if (td) fd.set('target_date', toPBDate(td));
      else fd.delete('target_date');

      if (id) await api(`/api/records/reminders/${id}`, { method: 'PATCH', body: fd });
      else    await api(`/api/records/reminders`, { method: 'POST', body: fd });
      toast(id ? 'Pengingat diperbarui' : 'Pengingat ditambahkan');

      const vehicleId = fd.get('vehicle');
      if (vehicleId) {
        state.currentVehicle = vehicleId;
        const sel = document.querySelector('#vehicle-select');
        if (sel) sel.value = vehicleId;
      }

      if (state.view === 'form') safeNavigate('reminders');
      else await refreshAfterWrite();
    }

    return { html, submit };
  },
};

/* ============================================================
   TITLES
   ============================================================ */

function getFormTitle(type, id) {
  const isEdit = !!id;
  const map = {
    vehicle:  isEdit ? 'Edit Kendaraan'       : 'Tambah Kendaraan Baru',
    service:  isEdit ? 'Edit Catatan Servis'  : 'Tambah Catatan Servis',
    fuel:     isEdit ? 'Edit Catatan BBM'     : 'Catat Isi BBM',
    document: isEdit ? 'Edit Dokumen'         : 'Tambah Dokumen',
    reminder: isEdit ? 'Edit Pengingat'       : 'Tambah Pengingat',
  };
  return map[type] || 'Form';
}

Object.assign(VT, {
  FORMS,
  getFormTitle,
});

})();