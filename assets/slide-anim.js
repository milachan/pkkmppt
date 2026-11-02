/* ==========================================================================
   slide-anim.js — Animasi masuk per slide
   --------------------------------------------------------------------------
   Memberi animasi "muncul" pada elemen slide tanpa mengubah markup, sehingga
   tata letak (posisi pixel) tetap utuh.

   Pendekatan v4 — sengaja dibuat SEDERHANA:
   • Animasi diputar dengan Web Animations API (`element.animate`).
     Ini kebal terhadap aturan CSS `!important` maupun batas spesifisitas,
     yang menjadi penyebab gagal di beberapa browser pada versi sebelumnya.
   • Tidak ada MutationObserver yang memantau `class` (dulu menyebabkan
     loop tak berujung), tidak ada reflow paksa berulang.
   • Hanya menggerakkan `opacity` dan `transform`, jadi tidak memicu reflow.

   Cara deteksi pergantian slide: memantau atribut `data-current` pada
   `.slide-number`, plus pembanding indeks slide aktif pada tiap frame
   (dibiayai satu requestAnimationFrame, murah, tanpa efek samping).
   ========================================================================== */
(function () {
  'use strict';

  var DUR       = 520;   // durasi normal (ms)
  var DUR_RED   = 400;   // durasi saat reduce-motion (ms)
  var STAGGER   = 70;    // jeda antar baris (ms)
  var MAX_DELAY = 640;   // batas delay
  var ROW_TOL   = 16;    // toleransi px satu baris

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

  /* Elemen kandidat, tanpa elemen yang bersarang di dalam kandidat lain. */
  function candidates(slide) {
    var nodes = Array.prototype.slice.call(slide.querySelectorAll(CANDIDATE_SEL));
    return nodes.filter(function (el) {
      if (el.matches(SKIP_SEL)) return false;
      if (el.closest('.notes')) return false;
      var p = el.parentElement && el.parentElement.closest(CANDIDATE_SEL);
      if (p && nodes.indexOf(p) !== -1) return false;
      return true;
    });
  }

  /* Urutkan per baris (atas → bawah) untuk efek stagger yang wajar. */
  function grouped(slide) {
    var list = candidates(slide);
    var rows = [];
    list.forEach(function (el, idx) {
      var top = 0, n = el;
      while (n && n !== slide) { top += n.offsetTop || 0; n = n.offsetParent; }
      if (!top) top = idx;                       // fallback bila tak terukur
      for (var i = 0; i < rows.length; i++) {
        if (Math.abs(rows[i].top - top) <= ROW_TOL) { rows[i].els.push(el); return; }
      }
      rows.push({ top: top, els: [el] });
    });
    rows.sort(function (a, b) { return a.top - b.top; });
    return rows;
  }

  function play(slide) {
    if (!slide) return;
    var reduced = prefersReduced();
    var dur     = reduced ? DUR_RED : DUR;
    var stagger = reduced ? 40 : STAGGER;

    // Batalkan animasi lama agar tidak bertumpuk saat berpindah cepat
    if (slide._animList) {
      slide._animList.forEach(function (a) { try { a.cancel(); } catch (e) {} });
    }
    slide._animList = [];

    var delay = 0;
    grouped(slide).forEach(function (row) {
      row.els.forEach(function (el) {
        var keyframes = [
          { opacity: 0 },
          { opacity: 1 }
        ];
        // Geseran vertikal hanya saat animasi penuh dimungkinkan
        if (!reduced) {
          keyframes = [
            { opacity: 0, transform: 'translate3d(0,18px,0)' },
            { opacity: 1, transform: 'translate3d(0,0,0)' }
          ];
        }
        try {
          var anim = el.animate(keyframes, {
            duration: dur,
            delay: delay,
            easing: 'cubic-bezier(.22,.61,.36,1)',
            fill: 'both'
          });
          slide._animList.push(anim);
        } catch (e) {
          /* Browser tanpa WAAPI: biarkan elemen tampil apa adanya */
          el.style.opacity = '1';
        }
      });
      delay = Math.min(delay + stagger, MAX_DELAY);
    });
  }

  function init() {
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

    /* Cek ringan per frame: hanya bertindak bila indeks slide aktif berubah.
       Tidak mengubah DOM saat tidak ada perubahan, jadi bebas dari loop. */
    function loop() {
      var a = activeIndex();
      if (a !== -1 && a !== last) {
        last = a;
        play(slides[a]);
      }
      requestAnimationFrame(loop);
    }

    // Animasi awal setelah gambar/font siap agar pengukuran baris akurat
    var started = false;
    function start() {
      if (started) return;
      started = true;
      last = -1;
      requestAnimationFrame(loop);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(start);
      // Jaring pengaman bila fonts.ready tidak resolve (file://)
      setTimeout(start, 600);
    } else {
      start();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
