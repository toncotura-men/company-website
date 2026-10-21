/* HERO'S CUP — calm interactions */
(function () {
  'use strict';

  var root = document.documentElement;
  var body = document.body;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js-motion');

  /* ---- staged page entrance ---- */
  window.requestAnimationFrame(function () {
    window.requestAnimationFrame(function () { body.classList.add('is-loaded'); });
  });

  /* ---- header state and scroll progress ---- */
  var hdr = document.querySelector('.hdr');
  var progressBar = document.querySelector('.page-progress i');
  var hasHero = !!document.querySelector('.hero, .phero');
  var floatCta = document.querySelector('.float-entry');
  var drawerOpen = false;
  var scrollQueued = false;

  function updateScrollScene() {
    var y = window.scrollY || window.pageYOffset;
    var doc = document.documentElement;
    var max = Math.max(1, doc.scrollHeight - window.innerHeight);
    // set on the bar itself: a variable on <html> would restyle the whole page every scroll frame
    if (progressBar) progressBar.style.transform = 'scaleX(' + Math.min(1, y / max).toFixed(4) + ')';

    if (hdr) {
      hdr.classList.toggle('is-scrolled', y > 18);
      hdr.classList.toggle('is-top', hasHero && y < 54 && !drawerOpen);
    }
    if (floatCta) {
      floatCta.classList.toggle('is-hidden', y < window.innerHeight * 0.72 || drawerOpen);
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

  /* ---- reveal on scroll (CSS turns it into a plain fade for reduced motion) ---- */
  var targets = document.querySelectorAll('.rv');
  var repPhoto = document.querySelector('.rep-photo.rv');
  var repBody = document.querySelector('.rep-body.rv');
  if (repPhoto) repPhoto.setAttribute('data-reveal', 'left');
  if (repBody) repBody.setAttribute('data-reveal', 'right');

  if ('IntersectionObserver' in window && targets.length) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = Number(el.getAttribute('data-delay') || 0);
        if (delay && !reducedMotion) el.style.transitionDelay = delay + 'ms';
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

  /* ---- pillar numbers (decorative) ---- */
  document.querySelectorAll('.pillar').forEach(function (card, i) {
    card.setAttribute('data-index', '0' + (i + 1));
  });

  /* ---- schedule tabs: sliding indicator and soft panel change ---- */
  document.querySelectorAll('[data-tabs]').forEach(function (group) {
    var bar = group.querySelector('.day-tabs');
    var tabs = group.querySelectorAll('.day-tab');

    function placeIndicator() {
      var on = group.querySelector('.day-tab.is-on');
      if (!bar || !on) return;
      bar.style.setProperty('--tab-x', on.offsetLeft + 'px');
      bar.style.setProperty('--tab-w', on.offsetWidth + 'px');
    }
    if (bar) {
      placeIndicator();
      bar.classList.add('has-indicator');
      window.addEventListener('resize', placeIndicator, { passive: true });
    }

    // arrow keys move between days, as expected of a tab list
    if (bar) bar.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      var list = Array.prototype.slice.call(tabs);
      var i = list.indexOf(document.activeElement);
      if (i < 0) return;
      var next = list[(i + (event.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length];
      next.focus();
      next.click();
    });

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        if (tab.classList.contains('is-on')) return;
        var id = tab.getAttribute('data-target');
        tabs.forEach(function (item) {
          var active = item === tab;
          item.classList.toggle('is-on', active);
          item.setAttribute('aria-selected', String(active));
        });
        group.querySelectorAll('.day-panel').forEach(function (panel) {
          var show = panel.id === id;
          panel.hidden = !show;
          panel.classList.remove('is-entering');
          if (show) {
            void panel.offsetWidth; // restart the fade
            panel.classList.add('is-entering');
          }
        });
        placeIndicator();
      });
    });
  });

  /* ---- rules: highlight the article being read ---- */
  var tocLinks = document.querySelectorAll('.rule-toc a[href^="#"]');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var linkFor = {};
    var headings = [];
    tocLinks.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      var h = document.getElementById(id);
      if (h) { linkFor[id] = link; headings.push(h); }
    });
    var setActive = function (id) {
      tocLinks.forEach(function (link) {
        var on = link === linkFor[id];
        link.classList.toggle('is-active', on);
        if (on) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    };
    var visible = {};
    var tocObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var h = entry.target.querySelector('h2[id]') || entry.target;
        visible[h.id] = entry.isIntersecting;
      });
      for (var i = 0; i < headings.length; i++) {
        if (visible[headings[i].id]) { setActive(headings[i].id); return; }
      }
    }, { rootMargin: '-30% 0px -55% 0px', threshold: 0 });
    headings.forEach(function (h) { tocObserver.observe(h.closest('.art') || h); });
  }

  /* ---- venue: pins appear grounds → parking → facilities, legend focuses a group ---- */
  var venue = document.querySelector('.venue-figure');
  if (venue) {
    var order = ['g', 'p', 's'];
    var n = 0;
    order.forEach(function (cat) {
      venue.querySelectorAll('.vpin.' + cat).forEach(function (pin) {
        pin.style.setProperty('--pin-i', String(n++));
      });
    });
    // keep every label inside the photo on narrow screens (the pin point itself stays put)
    var fitPins = function () {
      // measured from layout (not the on-screen box) so an in-flight transition can't skew it
      venue.querySelectorAll('.vpin').forEach(function (pin) {
        var area = pin.offsetParent ? pin.offsetParent.clientWidth : 0;
        var left = pin.offsetLeft - pin.offsetWidth / 2;
        var right = left + pin.offsetWidth;
        var dx = 0;
        if (left < 4) dx = 4 - left;
        else if (right > area - 4) dx = area - 4 - right;
        pin.style.setProperty('--pin-dx', dx.toFixed(1) + 'px');
      });
    };
    fitPins();
    window.addEventListener('resize', fitPins, { passive: true });
    window.addEventListener('load', fitPins);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitPins); // labels widen once web fonts arrive
    var showPins = function () { venue.classList.add('pins-in'); };
    if ('IntersectionObserver' in window) {
      var pinObserver = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        showPins();
        pinObserver.disconnect();
      }, { threshold: 0.35 });
      pinObserver.observe(venue);
    } else {
      showPins();
    }

    var legendItems = document.querySelectorAll('.venue-legend span');
    var focusCat = function (cat) {
      if (cat) venue.setAttribute('data-focus', cat);
      else venue.removeAttribute('data-focus');
      legendItems.forEach(function (item) {
        var on = !!cat && item.getAttribute('data-cat') === cat;
        item.classList.toggle('is-on', on);
        item.setAttribute('aria-pressed', String(on));
      });
    };
    legendItems.forEach(function (item, i) {
      var cat = order[i];
      if (!cat) return;
      item.setAttribute('data-cat', cat);
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.setAttribute('aria-pressed', 'false');
      item.addEventListener('mouseenter', function () { focusCat(cat); });
      item.addEventListener('mouseleave', function () { if (document.activeElement !== item) focusCat(null); });
      item.addEventListener('focus', function () { focusCat(cat); });
      item.addEventListener('blur', function () { focusCat(null); });
      item.addEventListener('click', function () { focusCat(cat); });
      item.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); focusCat(cat); }
      });
    });
  }

  /* ---- current nav item ---- */
  var file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.nav a[href], .drawer a[href]').forEach(function (anchor) {
    var href = (anchor.getAttribute('href') || '').split('#')[0].toLowerCase();
    if (href && href === file) anchor.classList.add('is-current');
  });

  /* ---- header dropdown: hover opens it (CSS); click / keyboard toggles ---- */
  var groups = document.querySelectorAll('.nav-group');
  function closeGroups(except) {
    groups.forEach(function (g) { if (g !== except) g.querySelector('.nav-top').setAttribute('aria-expanded', 'false'); });
  }
  groups.forEach(function (g) {
    var btn = g.querySelector('.nav-top');
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      closeGroups(g); btn.setAttribute('aria-expanded', String(open));
    });
    g.addEventListener('mouseleave', function () { btn.setAttribute('aria-expanded', 'false'); });
    g.addEventListener('focusout', function (e) { if (!g.contains(e.relatedTarget)) btn.setAttribute('aria-expanded', 'false'); });
    g.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
    });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.nav-group')) closeGroups(); });

  /* ---- カーソルについてくる光（マウスの端末だけ。位置は CSS の --mx / --my） ---- */
  if (window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.pillar, .shift-rows li, .exp-card').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  updateScrollScene();
})();
