/* =====================================================================
   core/state.js — Global State
   =====================================================================
   Fungsi:
     State global aplikasi + konstanta view-related.

   State:
     - view              → view saat ini ('dashboard' | 'vehicles' | ...)
     - vehicles          → list kendaraan
     - currentVehicle    → filter kendaraan aktif
     - currentDetailId   → ID kendaraan yang sedang dibuka detailnya
     - currentFormType   → 'vehicle' | 'service' | ...
     - currentFormId     → ID record yang sedang diedit (null = new)
     - records           → cache per collection { service_records: [...], ... }

   Depends:
     - utils/*
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;

const state = {
  view: 'dashboard',
  vehicles: [],
  currentVehicle: '',
  currentDetailId: null,
  currentFormType: null,
  currentFormId: null,
  records: {},
};

/** View yang punya filter kendaraan di header */
const FILTERABLE_VIEWS = [
  'dashboard',
  'service_records',
  'fuel_logs',
  'documents',
  'reminders',
  'reports',     // ⬅️ BARU — laporan bisa di-filter per kendaraan
];
Object.assign(VT, {
  state,
  FILTERABLE_VIEWS,
});

})();