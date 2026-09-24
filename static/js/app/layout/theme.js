/* =====================================================================
   layout/theme.js — Dark/Light Theme Toggle
   =====================================================================
   Fungsi:
     - Apply theme ke <html data-bs-theme="...">
     - Simpan ke localStorage ('vt-theme')
     - Sinkron dengan system preference kalau user belum pilih manual
     - Update icon tombol theme (moon ↔ sun)

   API:
     - applyTheme(theme)
     - initTheme()
     - toggleTheme()

   Depends:
     - utils/dom.js
     - utils/icons.js
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;

const THEME_KEY = 'vt-theme';

function getStoredTheme() {
  try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
}

function setStoredTheme(theme) {
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
}

function getSystemTheme() {
  if (window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

function applyTheme(theme) {
  const html = document.documentElement;
  const current = html.getAttribute('data-bs-theme');

  // Smooth transition
  if (current && current !== theme) {
    html.classList.add('theme-transition');
    setTimeout(() => html.classList.remove('theme-transition'), 400);
  }

  html.setAttribute('data-bs-theme', theme);
  setStoredTheme(theme);

  // Update tombol theme icon
  const btn = document.getElementById('btn-theme');
  if (btn) {
    const ic = btn.querySelector('i');
    if (ic) {
      ic.className = theme === 'dark'
        ? VT.ICONS.moon
        : VT.ICONS.sun;
    }
    btn.title = theme === 'dark' ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode';
  }

  // Update meta theme-color
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#020617' : '#f1f5f9');
  }
}

function initTheme() {
  const stored = getStoredTheme();
  const theme = stored || getSystemTheme();
  applyTheme(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-bs-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}

Object.assign(VT, {
  getStoredTheme,
  setStoredTheme,
  getSystemTheme,
  applyTheme,
  initTheme,
  toggleTheme,
});

window.toggleTheme = toggleTheme;
window.applyTheme = applyTheme;

})();