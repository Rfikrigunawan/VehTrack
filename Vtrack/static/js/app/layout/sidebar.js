/* =====================================================================
   layout/sidebar.js — Sidebar Navigation + Mobile Drawer
   =====================================================================
   Fungsi:
     - setActiveSidebar(view, formType) → highlight item aktif
     - openSidebarMobile() / closeSidebarMobile()
     - Event listener untuk hamburger + overlay

   Depends:
     - utils/dom.js
     - core/router.js (via VT.navigateTo)
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;
const { $, $$ } = VT;

/**
 * Update active state di sidebar.
 * @param {string} view      - view aktif ('dashboard' | 'vehicles' | 'form' | ...)
 * @param {string} [formType] - kalau view === 'form', ini menentukan menu aktif
 */
function setActiveSidebar(view, formType) {
  let navView = view;
  if (view === 'detail') navView = 'vehicles';
  if (view === 'form') {
    navView = {
      vehicle:  'vehicles',
      service:  'service_records',
      fuel:     'fuel_logs',
      document: 'documents',
      reminder: 'reminders',
    }[formType] || 'dashboard';
  }

  $$('.sidebar-item').forEach((x) => x.classList.remove('active'));
  const nav = document.querySelector(`.sidebar-item[data-nav="${navView}"]`);
  if (nav) nav.classList.add('active');
}

function openSidebarMobile() {
  const el = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!el) return;
  el.classList.add('open');
  if (overlay) overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSidebarMobile() {
  const el = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (el) el.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}

/**
 * Attach event listener untuk sidebar.
 * Dipanggil dari main.js saat bootstrap.
 */
function initSidebar() {
  // Sidebar items — klik navigate
  $$('.sidebar-item').forEach((el) => {
    el.addEventListener('click', () => {
      VT.navigateTo(el.dataset.nav);
      if (window.innerWidth < 992) closeSidebarMobile();
    });
  });

  // Hamburger toggle
  const ham = $('#btn-hamburger');
  if (ham) {
    ham.addEventListener('click', () => {
      const el = document.getElementById('sidebar');
      if (!el) return;
      if (el.classList.contains('open')) closeSidebarMobile();
      else openSidebarMobile();
    });
  }

  // Overlay click → close
  const overlay = $('#sidebar-overlay');
  if (overlay) overlay.addEventListener('click', closeSidebarMobile);

  // Resize → auto-close
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 992) closeSidebarMobile();
  });

  // ESC → close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSidebarMobile();
      if (typeof VT.closeLightbox === 'function') VT.closeLightbox();
    }
  });
}

Object.assign(VT, {
  setActiveSidebar,
  openSidebarMobile,
  closeSidebarMobile,
  initSidebar,
});

})();