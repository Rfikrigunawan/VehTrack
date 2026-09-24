/* =====================================================================
   form/builders.js — Form HTML Builders
   =====================================================================
   Fungsi:
     - formSection()       → wrapper dengan icon header
     - field()             → input (text/number/date/textarea)
     - selectField()       → dropdown
     - vehicleSelectField()→ dropdown kendaraan (special)
     - checkboxField()     → custom checkbox
     - fileField()         → file dropzone
     - existingPhotoPreview()  → preview foto lama
     - existingFilesPreview()  → preview lampiran lama

   Depends:
     - utils/*
     - core/state.js
     - shared/files.js
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;
const { state, icon, iconHtml, escapeHtml } = VT;

function formSection(title, iconName, content, tone = 'primary') {
  return `
    <div class="form-section">
      <div class="form-section-header">
        <span class="form-section-icon tone-${tone}">
          ${iconHtml(iconName)}
        </span>
        <h6 class="form-section-title">${title}</h6>
      </div>
      <div class="form-section-body">${content}</div>
    </div>
  `;
}

function field(name, label, type = 'text', value = '', required = false,
               placeholder = '', step = null, opts = {}) {
  const iconName = opts.icon || null;
  const hint = opts.hint || null;
  const addon = opts.addon || null;
  const requiredMark = required ? ' <span class="req">*</span>' : '';

  // Textarea
  if (type === 'textarea') {
    return `
      <div class="form-field-modern">
        <label class="form-label-modern" for="f-${name}">${label}${requiredMark}</label>
        <div class="input-modern-wrap">
          ${iconName ? `<i class="${icon(iconName)} input-modern-icon input-modern-icon-top"></i>` : ''}
          <textarea name="${name}" id="f-${name}" rows="3" ${required ? 'required' : ''}
            class="form-control-modern form-textarea-modern ${iconName ? 'has-icon' : ''}"
            placeholder="${placeholder || ''}">${escapeHtml(value ?? '')}</textarea>
        </div>
        ${hint ? `<div class="form-hint-modern">${hint}</div>` : ''}
      </div>
    `;
  }

  // Date (Flatpickr)
  if (type === 'date') {
    return `
      <div class="form-field-modern">
        <label class="form-label-modern" for="f-${name}">${label}${requiredMark}</label>
        <div class="input-modern-wrap">
          ${iconName ? `<i class="${icon(iconName)} input-modern-icon"></i>` : ''}
          <input type="text" name="${name}" id="f-${name}"
            value="${escapeHtml(value ?? '')}" ${required ? 'required' : ''}
            data-datepicker autocomplete="off" placeholder="dd-mm-yyyy HH:MM"
            class="form-control-modern ${iconName ? 'has-icon' : ''} ${addon ? 'has-addon' : ''}">
          ${addon ? `<span class="input-modern-addon">${addon}</span>` : ''}
        </div>
        ${hint ? `<div class="form-hint-modern">${hint}</div>` : ''}
      </div>
    `;
  }

  // Default input
  return `
    <div class="form-field-modern">
      <label class="form-label-modern" for="f-${name}">${label}${requiredMark}</label>
      <div class="input-modern-wrap">
        ${iconName ? `<i class="${icon(iconName)} input-modern-icon"></i>` : ''}
        <input type="${type}" name="${name}" id="f-${name}"
          value="${escapeHtml(value ?? '')}" ${required ? 'required' : ''}
          ${placeholder ? `placeholder="${placeholder}"` : ''}
          ${step ? `step="${step}"` : ''}
          class="form-control-modern ${iconName ? 'has-icon' : ''} ${addon ? 'has-addon' : ''}">
        ${addon ? `<span class="input-modern-addon">${addon}</span>` : ''}
      </div>
      ${hint ? `<div class="form-hint-modern">${hint}</div>` : ''}
    </div>
  `;
}

function selectField(name, label, options, value = '', required = false, opts = {}) {
  const iconName = opts.icon || null;
  const hint = opts.hint || null;
  const requiredMark = required ? ' <span class="req">*</span>' : '';

  return `
    <div class="form-field-modern">
      <label class="form-label-modern" for="f-${name}">${label}${requiredMark}</label>
      <div class="input-modern-wrap">
        ${iconName ? `<i class="${icon(iconName)} input-modern-icon"></i>` : ''}
        <select name="${name}" id="f-${name}" ${required ? 'required' : ''}
          class="form-select-modern ${iconName ? 'has-icon' : ''}">
          <option value="">-- Pilih --</option>
          ${options.map((o) => {
            const val = typeof o === 'string' ? o : o.value;
            const lbl = typeof o === 'string' ? o : o.label;
            return `<option value="${escapeHtml(val)}" ${value === val ? 'selected' : ''}>${escapeHtml(lbl)}</option>`;
          }).join('')}
        </select>
      </div>
      ${hint ? `<div class="form-hint-modern">${hint}</div>` : ''}
    </div>
  `;
}

function vehicleSelectField(selected = '') {
  const cur = selected || state.currentVehicle || (state.vehicles[0] && state.vehicles[0].id);
  return `
    <div class="form-field-modern">
      <label class="form-label-modern" for="f-vehicle">Kendaraan <span class="req">*</span></label>
      <div class="input-modern-wrap">
        <i class="${icon('car')} input-modern-icon"></i>
        <select name="vehicle" id="f-vehicle" required class="form-select-modern has-icon">
          ${state.vehicles.map((v) =>
            `<option value="${v.id}" ${v.id === cur ? 'selected' : ''}>
              ${escapeHtml(v.nama)} · ${escapeHtml(v.plat_nomor || '-')}
            </option>`
          ).join('')}
        </select>
      </div>
    </div>
  `;
}

function checkboxField(name, label, checked = false, hint = '') {
  return `
    <label class="form-check-modern">
      <input type="checkbox" name="${name}" ${checked ? 'checked' : ''}>
      <span class="form-check-modern-box"></span>
      <span class="form-check-modern-content">
        <span class="form-check-modern-label">${label}</span>
        ${hint ? `<span class="form-check-modern-hint">${hint}</span>` : ''}
      </span>
    </label>
  `;
}

function fileField(name, label, hint = '') {
  return `
    <div class="form-field-modern">
      <label class="form-label-modern">${label}</label>
      <label class="file-modern-wrap" data-file-dropzone>
        <input type="file" name="${name}" class="file-modern-input" data-file-input>
        <span class="file-modern-icon">${iconHtml('cloudUpload')}</span>
        <span class="file-modern-text">
          <span class="file-modern-title" data-file-title>Pilih file atau drop di sini</span>
          <span class="file-modern-hint" data-file-hint>${hint || 'Gambar atau PDF · Maks 5 MB'}</span>
        </span>
      </label>
      <div class="file-modern-preview" data-file-preview hidden></div>
    </div>
  `;
}

function existingPhotoPreview(url, name) {
  if (!url) return '';
  return `
    <div class="existing-photo-wrap">
      <img src="${url}" alt="${escapeHtml(name)}"
           class="existing-photo"
           onclick="openLightbox('${url}', '${VT.escapeStr(name)}')">
      <div class="existing-photo-badge">Foto saat ini</div>
    </div>
  `;
}

function existingFilesPreview(collection, recordId, files, label = 'Lampiran saat ini') {
  const list = VT.normalizeFiles(files);
  if (!list.length) return '';
  return `
    <div class="existing-files-wrap">
      <div class="existing-files-label">${label} (${list.length}):</div>
      ${VT.fileGridHtml(collection, recordId, list, 64)}
    </div>
  `;
}

Object.assign(VT, {
  formSection,
  field,
  selectField,
  vehicleSelectField,
  checkboxField,
  fileField,
  existingPhotoPreview,
  existingFilesPreview,
});

})();