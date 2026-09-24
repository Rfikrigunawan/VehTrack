/* =====================================================================
   core/api.js — HTTP Wrapper + Toast
   =====================================================================
   Fungsi:
     - api(path, opts)  → fetch dengan credentials + JSON error handling
     - toast(msg, type) → Bootstrap Toast notification

   Depends:
     - utils/dom.js
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;
const { $ } = VT;

/**
 * Fetch wrapper dengan:
 *   - credentials: 'same-origin' (cookie ikut)
 *   - Auto-parse JSON
 *   - Auto-throw Error kalau !res.ok
 */
async function api(path, opts = {}) {
  const fetchOpts = {
    credentials: 'same-origin',
    ...opts,
  };
  const res = await fetch(path, fetchOpts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

let _toastInstance = null;

/**
 * Tampilkan notifikasi toast.
 * @param {string} msg
 * @param {'success'|'error'} type
 */
function toast(msg, type = 'success') {
  const el = $('#toast');
  const body = $('#toast-body');
  if (!el || !body) return;

  body.textContent = msg;

  el.classList.remove('text-bg-success', 'text-bg-danger');
  el.classList.add(type === 'error' ? 'text-bg-danger' : 'text-bg-success');

  if (!_toastInstance) {
    _toastInstance = new bootstrap.Toast(el, { delay: 2500 });
  }
  _toastInstance.show();
}

Object.assign(VT, {
  api,
  toast,
});

})();