/* =====================================================================
   utils/dom.js — DOM Helpers
   =====================================================================
   Fungsi:
     - $ , $$  → querySelector / querySelectorAll shortcut
     - escapeHtml() → sanitize HTML
     - escapeStr()  → escape single quote untuk inline onclick

   Depends:
     - utils/icons.js (untuk namespace VT)
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

/**
 * Escape HTML entities — untuk mencegah XSS saat inject string
 * ke innerHTML.
 */
function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

/**
 * Escape single quote — untuk dipakai di inline onclick
 * yang dibungkus string JS: onclick="fn('${escapeStr(x)}')"
 */
function escapeStr(s) {
  return String(s || '').replace(/'/g, "\\'");
}

Object.assign(VT, {
  $, $$,
  escapeHtml,
  escapeStr,
});

})();