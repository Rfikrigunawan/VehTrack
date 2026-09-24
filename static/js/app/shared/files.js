/* =====================================================================
   shared/files.js — File Helpers + Lightbox
   =====================================================================
   Fungsi:
     File:
       - normalizeFiles(val)  → selalu return array
       - fileUrl()            → URL file PocketBase
       - fileExt(), isImage(), isPdf(), fileIcon()
       - vehiclePhotoHtml(v)  → banner foto kendaraan
       - fileGridHtml()       → grid thumbnail

     Lightbox:
       - openLightbox(url, title)
       - closeLightbox()

   Depends:
     - utils/*
     - core/api.js (untuk namespace)
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;
const { ICONS, icon, iconHtml, escapeHtml, escapeStr } = VT;

/* ============================================================
   FILE HELPERS
   ============================================================ */

/** Pastikan nilai selalu array (kadang PocketBase return string). */
function normalizeFiles(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return [val];
}

/** URL file PocketBase (via proxy Flask). */
function fileUrl(collection, recordId, filename) {
  if (!filename) return '';
  return `/api/files/${collection}/${recordId}/${encodeURIComponent(filename)}`;
}

function fileExt(f) {
  return (f || '').split('.').pop().toLowerCase();
}
function isImage(f) {
  return ['jpg','jpeg','png','gif','webp','bmp','svg'].includes(fileExt(f));
}
function isPdf(f) {
  return fileExt(f) === 'pdf';
}

/** Mapping ekstensi → icon name. */
function fileIcon(f) {
  const ext = fileExt(f);
  if (isPdf(f)) return 'filePdf';
  if (['doc', 'docx'].includes(ext)) return 'fileWord';
  if (['xls', 'xlsx'].includes(ext)) return 'fileExcel';
  return 'file';
}

/** HTML banner foto kendaraan (untuk list kendaraan). */
function vehiclePhotoHtml(v) {
  if (!v.foto) return '';
  const photo = fileUrl('vehicles', v.id, v.foto);
  return `
    <div class="vehicle-photo-banner"
         onclick="event.stopPropagation(); openLightbox('${photo}', '${escapeStr(v.nama)}')">
      <img src="${photo}" alt="${escapeHtml(v.nama)}" loading="lazy"
           onerror="this.parentElement.style.display='none'" />
    </div>`;
}

/** Grid thumbnail file (untuk kolom "Nota" di tabel servis). */
function fileGridHtml(collection, recordId, files, size = 48) {
  const list = normalizeFiles(files);
  if (!list.length) return '';

  return `
    <div class="file-grid">
      ${list.map((f) => {
        const url = fileUrl(collection, recordId, f);
        const img = isImage(f);
        const s = `width:${size}px;height:${size}px;`;
        const fnameEsc = String(f).replace(/'/g, "\\'");
        return `
          <div class="file-thumb" style="${s}"
               onclick="event.stopPropagation(); ${img
                 ? `openLightbox('${url}', '${fnameEsc}')`
                 : `window.open('${url}', '_blank')`}">
            ${img
              ? `<img src="${url}" loading="lazy"
                       onerror="this.replaceWith(Object.assign(document.createElement('i'),{className:'${icon('image')} file-thumb-icon'}))" />`
              : `<i class="${icon(fileIcon(f))} file-thumb-icon"></i>`}
          </div>`;
      }).join('')}
    </div>`;
}

/* ============================================================
   LIGHTBOX
   ============================================================ */

function openLightbox(url, title = '') {
  let lb = document.getElementById('lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.className = 'position-fixed top-0 start-0 w-100 h-100 d-none align-items-center justify-content-center p-3';
    lb.style.cssText = 'z-index:1080;background:rgba(0,0,0,0.92);';

    const closeIcon = icon('close');
    const downloadIcon = icon('download');

    lb.innerHTML = `
      <div class="position-absolute top-0 end-0 m-3 d-flex gap-2" style="z-index:10;">
        <a id="lb-download" download
           class="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center"
           style="width:40px;height:40px;" title="Download">
          <i class="${downloadIcon}"></i>
        </a>
        <button id="lb-close" type="button"
                class="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center"
                style="width:40px;height:40px;" title="Tutup">
          <i class="${closeIcon}"></i>
        </button>
      </div>
      <div id="lb-title" class="position-absolute top-0 start-0 m-3 text-white-50 small text-truncate" style="max-width:65%;"></div>
      <img id="lb-img" class="mh-100 mw-100 rounded-3" alt="" />
    `;
    document.body.appendChild(lb);

    lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
    document.getElementById('lb-close').addEventListener('click', closeLightbox);
  }

  document.getElementById('lb-img').src = url;
  document.getElementById('lb-download').href = url;
  document.getElementById('lb-title').textContent = title || '';

  lb.classList.remove('d-none');
  lb.classList.add('d-flex');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  lb.classList.add('d-none');
  lb.classList.remove('d-flex');
  document.body.style.overflow = '';

  const img = document.getElementById('lb-img');
  if (img) img.src = '';
}

Object.assign(VT, {
  normalizeFiles,
  fileUrl,
  fileExt,
  isImage,
  isPdf,
  fileIcon,
  vehiclePhotoHtml,
  fileGridHtml,
  openLightbox,
  closeLightbox,
});

// Expose untuk inline onclick
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;

})();