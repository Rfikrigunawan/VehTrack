/* =====================================================================
   core/router.js — URL Routing (SPA)
   =====================================================================
   Fungsi:
     - parseLocation()   → baca URL → objek { view, formType, formId, detailId }
     - buildURL()        → state → URL string
     - navigateTo()      → pindah view + update history + reload
     - applyLocation()   → dipanggil saat popstate / initial load
     - goToForm()        → shortcut ke form view

   Route Map:
     /app/dashboard
     /app/vehicles
     /app/vehicles/{id}           → detail
     /app/services
     /app/services/new            → form new
     /app/services/{id}/edit      → form edit
     /app/fuel, /app/documents, /app/reminders, /app/settings

   Depends:
     - core/state.js
     - utils/*
     - layout/sidebar.js (via VT.setActiveSidebar — optional)
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;
const { state } = VT;

/* ---------- Mapping tables ---------- */
const VIEW_TO_URL = {
  dashboard:       'dashboard',
  detail:          'vehicles',
  form:            null,
  vehicles:        'vehicles',
  service_records: 'services',
  fuel_logs:       'fuel',
  documents:       'documents',
  reminders:       'reminders',
  reports:         'reports',       
  settings:        'settings',
};

const URL_TO_VIEW = {
  dashboard:  'dashboard',
  vehicles:   'vehicles',
  services:   'service_records',
  fuel:       'fuel_logs',
  documents:  'documents',
  reminders:  'reminders',
  reports:    'reports',            
  settings:   'settings',
};

const SLUG_TO_FORM = {
  vehicles:  'vehicle',
  services:  'service',
  fuel:      'fuel',
  documents: 'document',
  reminders: 'reminder',
};

const FORM_TO_SLUG = {
  vehicle:  'vehicles',
  service:  'services',
  fuel:     'fuel',
  document: 'documents',
  reminder: 'reminders',
};

/* ---------- Parse / Build ---------- */

function parseLocation() {
  const path = window.location.pathname
    .replace(/^\/app\/?/, '')
    .replace(/\/$/, '');

  if (!path) return { view: 'dashboard' };

  const parts = path.split('/').filter(Boolean);
  const slug = (parts[0] || '').toLowerCase();

  // /app/{slug}/new
  if (parts[1] === 'new') {
    const formType = SLUG_TO_FORM[slug];
    if (formType) return { view: 'form', formType, formId: null };
  }

  // /app/{slug}/{id}/edit
  if (parts[1] && parts[2] === 'edit') {
    const formType = SLUG_TO_FORM[slug];
    if (formType) return { view: 'form', formType, formId: parts[1] };
  }

  // /app/vehicles/{id} → detail
  if (slug === 'vehicles' && parts[1]) {
    return { view: 'detail', detailId: parts[1] };
  }

  const view = URL_TO_VIEW[slug];
  return view ? { view } : { view: 'dashboard' };
}

function buildURL(view, opts = {}) {
  if (view === 'form') {
    const slug = FORM_TO_SLUG[opts.formType] || 'dashboard';
    if (opts.formId) return `/app/${slug}/${opts.formId}/edit`;
    return `/app/${slug}/new`;
  }
  if (view === 'detail' && opts.detailId) {
    return `/app/vehicles/${encodeURIComponent(opts.detailId)}`;
  }
  return `/app/${VIEW_TO_URL[view] || 'dashboard'}`;
}

/* ---------- Navigate ---------- */

function navigateTo(view, opts = {}, { replace = false } = {}) {
  if (typeof opts === 'string') {
    if (view === 'detail') opts = { detailId: opts };
    else opts = {};
  }

  state.view = view;
  state.currentDetailId = opts.detailId || null;
  state.currentFormType = opts.formType || null;
  state.currentFormId = opts.formId || null;

  // Update sidebar active state
  if (typeof VT.setActiveSidebar === 'function') {
    VT.setActiveSidebar(view, opts.formType);
  }

  // Update URL
  const url = buildURL(view, opts);
  try {
    if (replace) {
      history.replaceState({ view, ...opts }, '', url);
    } else if (window.location.pathname !== url) {
      history.pushState({ view, ...opts }, '', url);
    }
  } catch (e) {
    window.location.hash = url;
  }

  // Reload data & render
  if (typeof VT.reloadAll === 'function') VT.reloadAll();

  // Scroll to top
  const content = document.querySelector('#content');
  if (content) content.scrollTo({ top: 0, behavior: 'smooth' });
}

function applyLocation() {
  const parsed = parseLocation();
  state.view = parsed.view;
  state.currentDetailId = parsed.detailId || null;
  state.currentFormType = parsed.formType || null;
  state.currentFormId = parsed.formId || null;

  if (typeof VT.setActiveSidebar === 'function') {
    VT.setActiveSidebar(parsed.view, parsed.formType);
  }

  if (typeof VT.reloadAll === 'function') VT.reloadAll();
}

function goToForm(type, id = null) {
  navigateTo('form', { formType: type, formId: id });
}

Object.assign(VT, {
  VIEW_TO_URL, URL_TO_VIEW, SLUG_TO_FORM, FORM_TO_SLUG,
  parseLocation, buildURL,
  navigateTo, applyLocation, goToForm,
});

// Expose untuk inline onclick
window.goToForm = goToForm;
window.navigateTo = navigateTo;

})();