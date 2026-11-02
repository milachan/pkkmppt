/* ==========================================================================
   slide-anim.js — Animasi masuk per slide (halus & elegan)
   --------------------------------------------------------------------------
   Menerapkan animasi entry ke elemen slide secara otomatis lewat JS, sehingga
   markup slide TIDAK perlu diubah dan tata letak (posisi pixel) tetap utuh.

   Hanya `opacity` + `transform` yang dianimasikan — keduanya tidak memicu
   reflow, jadi tidak menggeser layout satu piksel pun.

   Cara kerja:
   1. Saat slide menjadi aktif (kelas `is-active`), elemen di dalamnya
      dikelompokkan ke "baris" berdasarkan posisi vertikal aslinya (offsetTop).
   2. Baris diurutkan atas -> bawah, diberi delay bertahap (stagger).
   3. Setiap baris masuk dengan fade-up ringan.

   Elemen yang sudah punya atribut `data-anim` dikecualikan supaya tidak
   dobel animasi dengan runtime.js.
   ========================================================================== */
(function () {
  'use strict';

  var DUR       = 520;   // durasi tiap elemen (ms)
  var STAGGER   = 70;    // jeda antar baris (ms)
  var MAX_DELAY = 640;   // batas delay maksimum agar tidak terasa lambat
  var ROW_TOL   = 14;    // toleransi px untuk menganggap elemen satu baris

  var SKIP_SEL = '.notes,[data-anim],script,style,br';

  var CANDIDATE_SEL = [
    '.deck-header', '.kicker', 'h1', 'h2', '.h2',
    '.kpi', '.card', '.award', '.item', '.mrow', '.m',
    '.bar', '.doclist > div', '.mitra', '.gal',
    '.piag-grid', '.guru-grid', '.big', '.val',
    '.pill', '.tag', '.chip', '.stat', '.mini',
    '.lokus-card', '.side', '.lead'
  ].join(',');

  function prefersReduced() {
    return !!(window.matchMedia &&
              window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* Kumpulkan elemen target satu slide, kelompokkan per baris vertikal. */
  function collect(slide) {
    var nodes = Array.prototype.slice.call(slide.querySelectorAll(CANDIDATE_SEL));

    var list = nodes.filter(function (el) {
      if (el.matches(SKIP_SEL)) return false;
      if (el.closest('.notes')) return false;
      // Jika ada induk yang juga kandidat, cukup animasikan induknya
      var parent = el.parentElement && el.parentElement.closest(CANDIDATE_SEL);
      if (parent && nodes.indexOf(parent) !== -1) return false;
      return true;
    });

    var rows = [];
    list.forEach(function (el) {
      var top = el.offsetTop;
      for (var i = 0; i < rows.length; i++) {
        if (Math.abs(rows[i].top - top) <= ROW_TOL) {
          rows[i].els.push(el);
          return;
        }
      }
      rows.push({ top: top, els: [el] });
    });

    rows.sort(function (a, b) { return a.top - b.top; });
    return rows;
  }

  function play(slide) {
    var reduced = prefersReduced();
    var dur     = reduced ? 180 : DUR;
    var stagger = reduced ? 30  : STAGGER;
    var delay   = 0;

    collect(slide).forEach(function (row) {
      row.els.forEach(function (el) {
        if (el.offsetHeight === 0 && el.offsetWidth === 0) return;

        el.style.animation = 'none';
        void el.offsetWidth;                    // paksa reflow agar bisa diulang
        el.style.animation =
          'slideRowIn ' + dur + 'ms cubic-bezier(.22,.61,.36,1) ' +
          delay + 'ms both';
      });
      delay = Math.min(delay + stagger, MAX_DELAY);
    });
  }

  function injectKeyframes() {
    if (document.getElementById('slide-anim-kf')) return;
    var s = document.createElement('style');
    s.id = 'slide-anim-kf';
    s.textContent =
      '@keyframes slideRowIn{' +
      'from{opacity:0;transform:translate3d(0,18px,0)}' +
      'to{opacity:1;transform:none}}';
    document.head.appendChild(s);
  }

  function init() {
    injectKeyframes();

    var deck = document.querySelector('.deck');
    if (!deck) return;

    var slides = Array.prototype.slice.call(deck.querySelectorAll('.slide'));
    var last   = -1;

    function activeIndex() {
      for (var i = 0; i < slides.length; i++) {
        if (slides[i].classList.contains('is-active')) return i;
      }
      return -1;
    }

    function check() {
      var active = activeIndex();
      if (active === -1 || active === last) return;
      last = active;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { play(slides[active]); });
      });
    }

    // Amati perubahan kelas `is-active` pada semua slide
    var mo = new MutationObserver(check);
    slides.forEach(function (s) {
      mo.observe(s, { attributes: true, attributeFilter: ['class'] });
    });

    check();  // slide pertama saat halaman dibuka
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
