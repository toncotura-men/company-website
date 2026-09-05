/* HERO'S CUP — site interactions */
(function () {
  'use strict';

  /* ---- header state (transparent over hero, solid after scroll) ---- */
  var hdr = document.querySelector('.hdr');
  var hasHero = !!document.querySelector('.hero, .phero');
  var floatCta = document.querySelector('.float-entry');
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (hdr) {
      hdr.classList.toggle('is-scrolled', y > 8);
      hdr.classList.toggle('is-top', hasHero && y < 40 && !drawerOpen);
    }
    if (floatCta) {
      floatCta.classList.toggle('is-hidden', y < window.innerHeight * 0.75 || drawerOpen);
    }
  }

  /* ---- mobile drawer ---- */
  var burger = document.querySelector('.burger');
  var drawer = document.querySelector('.drawer');
  var drawerOpen = false;
  function setDrawer(open) {
    drawerOpen = open;
    if (!burger || !drawer) return;
    burger.setAttribute('aria-expanded', String(open));
    drawer.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    onScroll();
  }
  if (burger) burger.addEventListener('click', function () { setDrawer(!drawerOpen); });
  if (drawer) drawer.addEventListener('click', function (e) {
    if (e.target.closest('a')) setDrawer(false);
  });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') setDrawer(false); });

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- reveal on scroll ---- */
  var targets = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && targets.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var d = el.getAttribute('data-delay');
        if (d) el.style.transitionDelay = d + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach(function (el) { io.observe(el); });
  } else {
    targets.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---- day tabs (schedule) ---- */
  document.querySelectorAll('[data-tabs]').forEach(function (group) {
    var tabs = group.querySelectorAll('.day-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var id = tab.getAttribute('data-target');
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle('is-on', on);
          t.setAttribute('aria-selected', String(on));
        });
        group.querySelectorAll('.day-panel').forEach(function (p) {
          p.hidden = (p.id !== id);
        });
      });
    });
  });

  /* ---- mark current nav item ---- */
  var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.nav a[href], .drawer a[href]').forEach(function (a) {
    var href = (a.getAttribute('href') || '').split('#')[0].toLowerCase();
    if (href && href === file) a.classList.add('is-current');
  });
})();
