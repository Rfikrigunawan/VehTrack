/* =====================================================================
   utils/formatters.js — Number & Vehicle Formatters
   =====================================================================
   Fungsi:
     - fmtRp(n)          → 'Rp 1.234.567' (Indonesian)
     - fmtNum(n)         → '1.234.567'
     - jenisIcon(jenis)  → icon class untuk jenis kendaraan
     - vehicleMeta(v)    → 'Toyota Avanza (2020)'

   Depends:
     - utils/icons.js
     - utils/dom.js
   ===================================================================== */

(function () {
'use strict';

const VT = window.VT;

/** Format angka → Rupiah */
const fmtRp = (n) => n == null ? '-' : 'Rp ' + Number(n).toLocaleString('id-ID');

/** Format angka → string dengan thousand separator */
const fmtNum = (n) => n == null ? '-' : Number(n).toLocaleString('id-ID');

/**
 * Mapping jenis kendaraan → icon name (untuk VT.icon()).
 * @param {string} jenis - 'motor' | 'mobil' | 'lainnya'
 * @returns {string} Icon name (bukan class!)
 */
function jenisIcon(jenis) {
  if (jenis === 'motor') return 'scooter';
  if (jenis === 'mobil') return 'car';
  return 'truck';
}

/**
 * Metadata kendaraan: 'Toyota Avanza (2020)'.
 */
function vehicleMeta(v) {
  return [v.merek, v.model, v.tahun ? `(${v.tahun})` : null]
    .filter(Boolean)
    .join(' ') || '-';
}

Object.assign(VT, {
  fmtRp,
  fmtNum,
  jenisIcon,
  vehicleMeta,
});

})();