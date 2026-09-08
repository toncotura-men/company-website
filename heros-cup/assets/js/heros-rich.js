/* HERO'S CUP — cinematic interactions */
(function () {
  'use strict';

  var root = document.documentElement;
  var body = document.body;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  root.classList.add('js-motion');

  /* ---- staged page entrance ---- */
  window.requestAnimationFrame(function () {
    window.requestAnimationFrame(function () { body.classList.add('is-loaded'); });
  });

  /* ---- header, scroll progress and gentle parallax ---- */
  var hdr = document.querySelector('.hdr');
  var hero = document.querySelector('.hero');
  var concept = document.querySelector('.concept');
  var rep = document.querySelector('.rep');
  var hasHero = !!document.querySelector('.hero, .phero');
  var floatCta = document.querySelector('.float-entry');
  var drawerOpen = false;
  var scrollQueued = false;

  function updateScrollScene() {
    var y = window.scrollY || window.pageYOffset;
    var doc = document.documentElement;
    var max = Math.max(1, doc.scrollHeight - window.innerHeight);
    root.style.setProperty('--page-progress', Math.min(1, y / max).toFixed(4));

    if (hdr) {
      hdr.classList.toggle('is-scrolled', y > 18);
      hdr.classList.toggle('is-top', hasHero && y < 54 && !drawerOpen);
    }
    if (floatCta) {
      floatCta.classList.toggle('is-hidden', y < window.innerHeight * 0.72 || drawerOpen);
    }

    if (!reducedMotion) {
      if (hero && y < window.innerHeight * 1.3) {
        hero.style.setProperty('--hero-scroll', (y * 0.075).toFixed(1) + 'px');
      }
      if (concept) {
        var cr = concept.getBoundingClientRect();
        if (cr.bottom > 0 && cr.top < window.innerHeight) {
          concept.style.setProperty('--concept-drift', ((window.innerHeight - cr.top) * 0.045).toFixed(1) + 'px');
        }
      }
      if (rep) {
        var rr = rep.getBoundingClientRect();
        if (rr.bottom > 0 && rr.top < window.innerHeight) {
          rep.style.setProperty('--rep-drift', ((window.innerHeight * 0.5 - rr.top) * 0.028).toFixed(1) + 'px');
        }
      }
    }
    scrollQueued = false;
  }

  function onScroll() {
    if (!scrollQueued) {
      scrollQueued = true;
      window.requestAnimationFrame(updateScrollScene);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });

  /* ---- mobile drawer ---- */
  var burger = document.querySelector('.burger');
  var drawer = document.querySelector('.drawer');
  function setDrawer(open) {
    drawerOpen = open;
    if (!burger || !drawer) return;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    drawer.classList.toggle('is-open', open);
    body.classList.toggle('has-open-menu', open);
    body.style.overflow = open ? 'hidden' : '';
    updateScrollScene();
  }
  if (burger) burger.addEventListener('click', function () { setDrawer(!drawerOpen); });
  if (drawer) drawer.addEventListener('click', function (event) {
    if (event.target.closest('a')) setDrawer(false);
  });
  window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && drawerOpen) {
      setDrawer(false);
      if (burger) burger.focus();
    }
  });

  /* ---- reveal system with directional and grouped stagger ---- */
  var targets = document.querySelectorAll('.rv');
  var repPhoto = document.querySelector('.rep-photo.rv');
  var repBody = document.querySelector('.rep-body.rv');
  if (repPhoto) repPhoto.setAttribute('data-reveal', 'left');
  if (repBody) repBody.setAttribute('data-reveal', 'right');

  if ('IntersectionObserver' in window && targets.length && !reducedMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = Number(el.getAttribute('data-delay') || 0);
        if (delay) el.style.transitionDelay = delay + 'ms';
        el.classList.add('is-in');
        revealObserver.unobserve(el);
      });
    }, { rootMargin: '0px 0px -9% 0px', threshold: 0.08 });
    targets.forEach(function (el) { revealObserver.observe(el); });
  } else {
    targets.forEach(function (el) { el.classList.add('is-in'); });
  }

  var sections = document.querySelectorAll('main section, body > section');
  if ('IntersectionObserver' in window && sections.length) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('is-active', entry.isIntersecting);
      });
    }, { rootMargin: '-28% 0px -48% 0px', threshold: 0 });
    sections.forEach(function (section) { sectionObserver.observe(section); });
  }

  /* ---- hero spotlight and depth ---- */
  if (hero && finePointer && !reducedMotion) {
    var logo = hero.querySelector('.hero-logo');
    hero.addEventListener('pointermove', function (event) {
      var rect = hero.getBoundingClientRect();
      var x = (event.clientX - rect.left) / rect.width;
      var y = (event.clientY - rect.top) / rect.height;
      hero.style.setProperty('--pointer-x', (x * 100).toFixed(1) + '%');
      hero.style.setProperty('--pointer-y', (y * 100).toFixed(1) + '%');
      if (logo) {
        logo.style.setProperty('--logo-x', ((x - 0.5) * 18).toFixed(1) + 'px');
        logo.style.setProperty('--logo-ry', ((x - 0.5) * 5).toFixed(1) + 'deg');
      }
    });
    hero.addEventListener('pointerleave', function () {
      hero.style.setProperty('--pointer-x', '72%');
      hero.style.setProperty('--pointer-y', '26%');
      if (logo) {
        logo.style.setProperty('--logo-x', '0px');
        logo.style.setProperty('--logo-ry', '0deg');
      }
    });
  }

  /* ---- responsive card tilt; decorative only ---- */
  var tiltCards = document.querySelectorAll('.pillar, .exp-card, .award');
  var pillarIndex = 0;
  tiltCards.forEach(function (card) {
    if (card.classList.contains('pillar')) {
      pillarIndex += 1;
      card.setAttribute('data-index', '0' + pillarIndex);
    }
    if (!finePointer || reducedMotion) return;
    card.addEventListener('pointermove', function (event) {
      var rect = card.getBoundingClientRect();
      var x = (event.clientX - rect.left) / rect.width;
      var y = (event.clientY - rect.top) / rect.height;
      var rx = (0.5 - y) * 7;
      var ry = (x - 0.5) * 8;
      card.style.setProperty('--card-x', (x * 100).toFixed(1) + '%');
      card.style.setProperty('--card-y', (y * 100).toFixed(1) + '%');
      card.style.transform = 'perspective(800px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-5px)';
    });
    card.addEventListener('pointerleave', function () { card.style.transform = ''; });
  });

  /* ---- magnetic CTA micro-interaction ---- */
  if (finePointer && !reducedMotion) {
    document.querySelectorAll('.btn').forEach(function (button) {
      button.addEventListener('pointermove', function (event) {
        var rect = button.getBoundingClientRect();
        var x = event.clientX - rect.left - rect.width / 2;
        var y = event.clientY - rect.top - rect.height / 2;
        button.style.transform = 'translate3d(' + (x * 0.08).toFixed(1) + 'px,' + (y * 0.12).toFixed(1) + 'px,0)';
      });
      button.addEventListener('pointerleave', function () { button.style.transform = ''; });
    });
  }

  /* ---- schedule tabs ---- */
  document.querySelectorAll('[data-tabs]').forEach(function (group) {
    var tabs = group.querySelectorAll('.day-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var id = tab.getAttribute('data-target');
        tabs.forEach(function (item) {
          var active = item === tab;
          item.classList.toggle('is-on', active);
          item.setAttribute('aria-selected', String(active));
        });
        group.querySelectorAll('.day-panel').forEach(function (panel) {
          panel.hidden = panel.id !== id;
        });
      });
    });
  });

  /* ---- current nav item ---- */
  var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.nav a[href], .drawer a[href]').forEach(function (anchor) {
    var href = (anchor.getAttribute('href') || '').split('#')[0].toLowerCase();
    if (href && href === file) anchor.classList.add('is-current');
  });

  updateScrollScene();
})();
