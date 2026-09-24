/* =====================================================================
   utils/icons.js — Central Icon Registry
   =====================================================================
   Fungsi:
     Single source of truth untuk SEMUA icon di aplikasi.
     Migrasi library icon (BI → FA) cukup ubah file ini.

   API:
     - VT.ICONS.car           → 'fa-solid fa-car-side'
     - VT.icon('car')         → 'fa-solid fa-car-side'
     - VT.icon('car', 'fa-2x')→ 'fa-solid fa-car-side fa-2x'
     - VT.iconHtml('car')     → '<i class="fa-solid fa-car-side"></i>'

   Depends:
     - Tidak ada (paling dasar)
   ===================================================================== */

(function () {
'use strict';

window.VT = window.VT || {};

const ICONS = {
  // ─────────── Navigation ───────────
  dashboard:     'fa-solid fa-table-cells-large',
  car:           'fa-solid fa-car-side',
  carFill:       'fa-solid fa-car-side',
  service:       'fa-solid fa-screwdriver-wrench',
  fuel:          'fa-solid fa-gas-pump',
  document:      'fa-solid fa-file-lines',
  reminder:      'fa-solid fa-bell',
  settings:      'fa-solid fa-gear',
  menu:          'fa-solid fa-bars',
  close:         'fa-solid fa-xmark',
  back:          'fa-solid fa-arrow-left',
  forward:       'fa-solid fa-arrow-right',
  chevronRight:  'fa-solid fa-chevron-right',
  refresh:       'fa-solid fa-rotate-right',
  filter:        'fa-solid fa-filter',

  // ─────────── Theme ───────────
  moon:          'fa-solid fa-moon',
  sun:           'fa-solid fa-sun',

  // ─────────── Actions ───────────
  add:           'fa-solid fa-plus',
  edit:          'fa-solid fa-pen-to-square',
  delete:        'fa-solid fa-trash',
  save:          'fa-solid fa-check',
  download:      'fa-solid fa-download',
  copy:          'fa-solid fa-clipboard',
  logout:        'fa-solid fa-right-from-bracket',
  logoutCircle:  'fa-solid fa-circle-xmark',
  userPlus:      'fa-solid fa-user-plus',
  login:         'fa-solid fa-right-to-bracket',

  // ─────────── Vehicle types ───────────
  scooter:       'fa-solid fa-motorcycle',
  truck:         'fa-solid fa-truck',
  carSide:       'fa-solid fa-car-side',

  // ─────────── Stats / Dashboard ───────────
  coins:         'fa-solid fa-coins',
  cashStack:     'fa-solid fa-sack-dollar',
  cash:          'fa-solid fa-money-bill',
  warning:       'fa-solid fa-triangle-exclamation',
  warningFill:   'fa-solid fa-triangle-exclamation',
  info:          'fa-solid fa-circle-info',
  check:         'fa-solid fa-circle-check',
  inbox:         'fa-solid fa-inbox',
  gauge:         'fa-solid fa-gauge-high',
  gauge2:        'fa-solid fa-gauge',
  chartLine:     'fa-solid fa-chart-line',
  grid:          'fa-solid fa-table-cells',
  gridGap:       'fa-solid fa-table-cells',
  droplet:       'fa-solid fa-droplet',
  dropletHalf:   'fa-solid fa-droplet',
  signpost:      'fa-solid fa-route',
  stopwatch:     'fa-solid fa-stopwatch',
  lightning:     'fa-solid fa-bolt',

  // ─────────── Form fields ───────────
  tag:           'fa-solid fa-tag',
  award:         'fa-solid fa-award',
  box:           'fa-solid fa-box',
  hash:          'fa-solid fa-hashtag',
  palette:       'fa-solid fa-palette',
  barcode:       'fa-solid fa-barcode',
  microchip:     'fa-solid fa-microchip',
  calendar:      'fa-solid fa-calendar-days',
  calendarCheck: 'fa-solid fa-calendar-check',
  calendarX:     'fa-solid fa-calendar-xmark',
  calendarPlus:  'fa-solid fa-calendar-plus',
  calendarEvent: 'fa-solid fa-calendar-day',
  location:      'fa-solid fa-location-dot',
  shop:          'fa-solid fa-shop',
  comment:       'fa-solid fa-comment',
  paperclip:     'fa-solid fa-paperclip',
  tools:         'fa-solid fa-screwdriver-wrench',
  bookmark:      'fa-solid fa-bookmark',
  heading:       'fa-solid fa-heading',
  cardText:      'fa-solid fa-file-lines',

  // ─────────── Files ───────────
  file:          'fa-solid fa-file',
  filePdf:       'fa-solid fa-file-pdf',
  fileWord:      'fa-solid fa-file-word',
  fileExcel:     'fa-solid fa-file-excel',
  image:         'fa-solid fa-image',
  cloudUpload:   'fa-solid fa-cloud-arrow-up',

  // ─────────── Auth / User ───────────
  user:          'fa-solid fa-user',
  envelope:      'fa-solid fa-envelope',
  lock:          'fa-solid fa-lock',
  shield:        'fa-solid fa-shield-halved',
  shieldCheck:   'fa-solid fa-shield-halved',
  eye:           'fa-solid fa-eye',
  eyeSlash:      'fa-solid fa-eye-slash',
  key:           'fa-solid fa-key',

  // ─────────── External ───────────
  telegram:      'fa-brands fa-telegram',
  database:      'fa-solid fa-database',
  book:          'fa-solid fa-book',

  // ─────────── Misc ───────────
  sliders:       'fa-solid fa-sliders',
  bullseye:      'fa-solid fa-bullseye',
  toggleOn:      'fa-solid fa-toggle-on',


  
  // ---------- Reports (BARU) ----------
  chartBar:      'fa-solid fa-chart-column',
  chartPie:      'fa-solid fa-chart-pie',
  chartArea:     'fa-solid fa-chart-area',
  //chartLine:     'fa-solid fa-chart-line',        // sudah ada
  trophy:        'fa-solid fa-trophy',
  rankingStar:   'fa-solid fa-star',
  arrowUp:       'fa-solid fa-arrow-trend-up',
  arrowDown:     'fa-solid fa-arrow-trend-down',
  //arrowRight:    'fa-solid fa-arrow-right',        // sudah ada
  //filter:        'fa-solid fa-filter',             // sudah ada
  //download:      'fa-solid fa-download',           // sudah ada
  print:         'fa-solid fa-print',
  fileCsv:       'fa-solid fa-file-csv',
  //fileExcel:     'fa-solid fa-file-excel',         // sudah ada
  calculator:    'fa-solid fa-calculator',
  percent:       'fa-solid fa-percent',
  calendarYear:  'fa-solid fa-calendar',
  clock:         'fa-solid fa-clock',
  route:         'fa-solid fa-route',
  weight:        'fa-solid fa-weight-hanging',
};


/**
 * Get icon class string.
 * @param {string} name - Key di ICONS
 * @param {string} [extra=''] - Class tambahan (mis. 'fa-2x')
 */
function icon(name, extra = '') {
  const base = ICONS[name] || 'fa-solid fa-circle-question';
  return extra ? `${base} ${extra}` : base;
}

/**
 * Render `<i class="...">`.
 */
function iconHtml(name, extraClass = '', ariaHidden = true) {
  const cls = icon(name, extraClass);
  const aria = ariaHidden ? ' aria-hidden="true"' : '';
  return `<i class="${cls}"${aria}></i>`;
}

Object.assign(window.VT, {
  ICONS,
  icon,
  iconHtml,
});

})();