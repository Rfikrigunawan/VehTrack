/* =====================================================================
   form/hooks.js — Form Interactions (Auto-calc, Datepicker, dll)
   =====================================================================
   Fungsi:
     - attachFilePreview()      → thumbnail preview untuk file input
     - attachFuelAutoCalc()     → Liter ↔ Harga ↔ Total auto-calc
     - attachDatepickers()      → Flatpickr init
     - attachVehicleAutoFill()  → Auto-fill odometer dari kendaraan
     - attachFormHooks()        → wrapper semua di atas

   Depends:
     - utils/*
     - core/state.js
     - form/builders.js (untuk escapeHtml)
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;
const { state, escapeHtml } = VT;

/* ============================================================
   FILE PREVIEW
   ============================================================ */

function attachFilePreview(container) {
  if (!container) return;

  const dropzones = container.querySelectorAll('[data-file-dropzone]');
  if (!dropzones.length) return;

  dropzones.forEach((dropzone) => {
    const input = dropzone.querySelector('[data-file-input]');
    if (!input) return;

    const titleEl = dropzone.querySelector('[data-file-title]');
    const hintEl = dropzone.querySelector('[data-file-hint]');
    const previewEl = dropzone.parentElement.querySelector('[data-file-preview]');

    const originalTitle = titleEl ? titleEl.textContent : 'Pilih file atau drop di sini';
    const originalHint = hintEl ? hintEl.textContent : '';

    const clearPreview = () => {
      if (previewEl) {
        previewEl.innerHTML = '';
        previewEl.hidden = true;
      }
      if (titleEl) titleEl.textContent = originalTitle;
      if (hintEl) hintEl.textContent = originalHint;
      dropzone.classList.remove('has-file');
    };

    const bindRemove = () => {
      const removeBtn = previewEl.querySelector('[data-file-remove]');
      if (!removeBtn) return;
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        input.value = '';
        clearPreview();
      });
    };

    const renderPreview = (file) => {
      if (!file) return clearPreview();

      const sizeKb = file.size / 1024;
      const sizeStr = sizeKb < 1024
        ? `${sizeKb.toFixed(1)} KB`
        : `${(sizeKb / 1024).toFixed(2)} MB`;

      if (titleEl) titleEl.textContent = file.name;
      if (hintEl) hintEl.textContent = `${sizeStr} · Siap diupload`;

      dropzone.classList.add('has-file');

      if (!previewEl) return;
      previewEl.hidden = false;

      const isImg = file.type.startsWith('image/');
      const isPdfFile = file.type === 'application/pdf';
      const ext = (file.name.split('.').pop() || '').toUpperCase();

      if (isImg) {
        const reader = new FileReader();
        reader.onload = (e) => {
          previewEl.innerHTML = `
            <div class="file-preview-item">
              <img src="${e.target.result}" alt="${escapeHtml(file.name)}" />
              <div class="file-preview-info">
                <div class="file-preview-name">${escapeHtml(file.name)}</div>
                <div class="file-preview-size">${sizeStr}</div>
              </div>
              <button type="button" class="file-preview-remove" data-file-remove title="Hapus">
                <i class="${VT.icon('close')}"></i>
              </button>
            </div>
          `;
          bindRemove();
        };
        reader.readAsDataURL(file);
      } else {
        previewEl.innerHTML = `
          <div class="file-preview-item file-preview-item-doc">
            <div class="file-preview-doc-icon">
              <i class="${VT.icon(isPdfFile ? 'filePdf' : 'file')}"></i>
            </div>
            <div class="file-preview-info">
              <div class="file-preview-name">${escapeHtml(file.name)}</div>
              <div class="file-preview-size">${sizeStr} · ${ext}</div>
            </div>
            <button type="button" class="file-preview-remove" data-file-remove title="Hapus">
              <i class="${VT.icon('close')}"></i>
            </button>
          </div>
        `;
        bindRemove();
      }
    };

    input.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      renderPreview(file);
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('is-dragover');
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('is-dragover');
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('is-dragover');
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        input.files = files;
        renderPreview(files[0]);
      }
    });
  });
}

/* ============================================================
   FUEL AUTO-CALC
   ============================================================ */

function attachFuelAutoCalc(container) {
  const literEl = container.querySelector('[name="liter"]');
  const hargaEl = container.querySelector('[name="harga_per_liter"]');
  const totalEl = container.querySelector('[name="total_biaya"]');

  if (!literEl || !hargaEl || !totalEl) return;

  let isCalculating = false;

  const numVal = (el) => {
    const v = parseFloat(el.value);
    return Number.isFinite(v) && v > 0 ? v : 0;
  };

  const setVal = (el, val, decimals = 2) => {
    if (val > 0 && Number.isFinite(val)) {
      const factor = Math.pow(10, decimals);
      const rounded = Math.round(val * factor) / factor;
      const oldVal = el.value;
      el.value = String(rounded);
      if (oldVal !== String(rounded)) {
        el.classList.remove('autocalc-filled');
        void el.offsetWidth;
        el.classList.add('autocalc-filled');
        setTimeout(() => el.classList.remove('autocalc-filled'), 500);
      }
    } else {
      el.value = '';
    }
  };

  const recalc = (source) => {
    if (isCalculating) return;
    isCalculating = true;

    const liter = numVal(literEl);
    const harga = numVal(hargaEl);
    const total = numVal(totalEl);

    if (source === 'liter') {
      if (harga > 0) setVal(totalEl, liter * harga, 0);
      else if (total > 0 && liter > 0) setVal(hargaEl, total / liter, 0);
    } else if (source === 'harga') {
      if (liter > 0) setVal(totalEl, liter * harga, 0);
      else if (total > 0 && harga > 0) setVal(literEl, total / harga, 2);
    } else if (source === 'total') {
      if (harga > 0) setVal(literEl, total / harga, 2);
      else if (liter > 0) setVal(hargaEl, total / liter, 0);
    }

    isCalculating = false;
  };

  literEl.addEventListener('input', () => recalc('liter'));
  hargaEl.addEventListener('input', () => recalc('harga'));
  totalEl.addEventListener('input', () => recalc('total'));
}

/* ============================================================
   DATEPICKER — Flatpickr
   ============================================================ */

function attachDatepickers(container) {
  if (!container) return;

  const dateInputs = container.querySelectorAll('[data-datepicker]');
  if (!dateInputs.length) return;

  // Fallback kalau flatpickr tidak tersedia
  if (typeof flatpickr === 'undefined') {
    console.warn('[form] flatpickr tidak tersedia. Fallback ke native datetime-local.');
    dateInputs.forEach((el) => {
      el.type = 'datetime-local';
      el.removeAttribute('placeholder');
      if (el.value) el.value = el.value.replace(' ', 'T');
    });
    return;
  }

  const localeId = {
    firstDayOfWeek: 1,
    weekdays: {
      shorthand: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
      longhand: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
    },
    months: {
      shorthand: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'],
      longhand: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
    },
  };

  dateInputs.forEach((el) => {
    if (el._flatpickr) return;

    const originalClass = el.className;
    const originalId = el.id;
    const originalName = el.getAttribute('name');
    const originalRequired = el.hasAttribute('required');

    flatpickr(el, {
      dateFormat: 'Y-m-d H:i',
      altInput: true,
      altFormat: 'd-m-Y H:i',
      enableTime: true,
      time_24hr: true,
      defaultHour: 0,
      defaultMinute: 0,
      minuteIncrement: 5,
      allowInput: true,
      disableMobile: false,
      locale: localeId,
      onReady: (_, __, instance) => {
        const alt = instance.altInput;
        if (!alt) return;

        alt.className = originalClass;
        if (originalId) alt.id = originalId + '-alt';
        if (originalName) alt.setAttribute('name', originalName);
        if (originalRequired) alt.setAttribute('required', 'required');

        if (originalId) {
          const label = container.querySelector(`label[for="${originalId}"]`);
          if (label) label.setAttribute('for', originalId + '-alt');
        }

        el.removeAttribute('id');

        alt.addEventListener('change', () => {
          el.dispatchEvent(new Event('change', { bubbles: true }));
        });

        alt.addEventListener('focus', () => {
          const wrap = alt.closest('.input-modern-wrap');
          if (wrap) wrap.classList.add('is-focused');
        });
        alt.addEventListener('blur', () => {
          const wrap = alt.closest('.input-modern-wrap');
          if (wrap) wrap.classList.remove('is-focused');
        });
      },
    });
  });
}

/* ============================================================
   VEHICLE AUTO-FILL (Odometer)
   ============================================================ */

function attachVehicleAutoFill(container) {
  const vehicleSel = container.querySelector('[name="vehicle"]');
  const odometerEl = container.querySelector('[name="odometer"]');
  if (!vehicleSel || !odometerEl) return;

  const flashOdometer = (el) => {
    el.classList.remove('autocalc-filled');
    void el.offsetWidth;
    el.classList.add('autocalc-filled');
    setTimeout(() => el.classList.remove('autocalc-filled'), 500);
  };

  const fillFromVehicle = (force = false) => {
    const vid = vehicleSel.value;
    const v = state.vehicles.find((x) => x.id === vid);
    if (!v) return;

    const lastOdo = Number(v.odometer_terakhir) || 0;

    if (force || !odometerEl.value) {
      if (lastOdo > 0) {
        odometerEl.value = lastOdo;
        flashOdometer(odometerEl);
      } else if (force) {
        odometerEl.value = '';
      }
    }
  };

  fillFromVehicle(false);
  vehicleSel.addEventListener('change', () => fillFromVehicle(true));
}

/* ============================================================
   WRAPPER
   ============================================================ */

function attachFormHooks(container) {
  if (!container) return;
  attachFilePreview(container);
  attachFuelAutoCalc(container);
  attachDatepickers(container);
  attachVehicleAutoFill(container);
}

Object.assign(VT, {
  attachFilePreview,
  attachFuelAutoCalc,
  attachDatepickers,
  attachVehicleAutoFill,
  attachFormHooks,
});

})();