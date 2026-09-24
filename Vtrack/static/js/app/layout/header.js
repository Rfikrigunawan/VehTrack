/* =====================================================================
   layout/header.js — Header Interactions
   =====================================================================
   Fungsi:
     - Refresh button
     - Vehicle filter select
     - Logout button
     - Popstate listener (browser back/forward)

   Depends:
     - utils/dom.js
     - core/state.js
     - core/router.js
     - layout/theme.js
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;
const { $, state, FILTERABLE_VIEWS } = VT;

function initHeader() {
  /* ---------- Logout ---------- */
  const logoutBtn = $('#btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      if (window.VT_MINI_APP_MODE && typeof window.__tgClose === 'function') {
        window.__tgClose();
      } else {
        window.location.href = '/';
      }
    });
  }

  /* ---------- Refresh button ---------- */
  const refreshBtn = $('#btn-refresh');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const ic = btn.querySelector('i');
      if (ic) ic.classList.add('spin-anim');
      await VT.reloadAll();
      if (ic) ic.classList.remove('spin-anim');
    });
  }

  /* ---------- Theme toggle ---------- */
  const themeBtn = $('#btn-theme');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      VT.toggleTheme();
      const ic = themeBtn.querySelector('i');
      if (ic) {
        ic.style.transition = 'transform 400ms cubic-bezier(0.4, 0, 0.2, 1)';
        ic.style.transform = 'rotate(360deg)';
        setTimeout(() => { ic.style.transform = ''; }, 400);
      }
    });
  }

  /* ---------- Listen OS theme change ---------- */
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)')
      .addEventListener('change', (e) => {
        if (!VT.getStoredTheme()) {
          VT.applyTheme(e.matches ? 'light' : 'dark');
        }
      });
  }

  /* ---------- Vehicle filter ---------- */
  const vehicleSel = $('#vehicle-select');
  if (vehicleSel) {
    vehicleSel.addEventListener('change', (e) => {
      state.currentVehicle = e.target.value;
      if (FILTERABLE_VIEWS.includes(state.view)) {
        VT.reloadAll();
      }
    });
  }

  /* ---------- Popstate (browser back/forward) ---------- */
  window.addEventListener('popstate', () => {
    const parsed = VT.parseLocation();
    if (parsed.view === state.view &&
        parsed.detailId === state.currentDetailId &&
        parsed.formType === state.currentFormType &&
        parsed.formId === state.currentFormId) return;
    VT.applyLocation();
  });
}

Object.assign(VT, {
  initHeader,
});

})();