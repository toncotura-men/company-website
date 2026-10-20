/* =========================================================
   HAKI pro — interactions & radar canvas
   No external libraries. No real-person imagery.
   ========================================================= */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Year ---------- */
  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.documentElement.classList.toggle("nav-open", open);
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); document.documentElement.classList.remove("nav-open"); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); document.documentElement.classList.remove("nav-open"); toggle.focus();
      }
    });
  }

  /* ---------- Header dropdowns: hover opens them (CSS); click / keyboard toggles ---------- */
  var groups = document.querySelectorAll(".nav-group");
  function closeGroups(except) {
    groups.forEach(function (g) { if (g !== except) g.querySelector(".nav-top").setAttribute("aria-expanded", "false"); });
  }
  groups.forEach(function (g) {
    var btn = g.querySelector(".nav-top");
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") !== "true";
      closeGroups(g); btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    g.addEventListener("mouseleave", function () { btn.setAttribute("aria-expanded", "false"); });
    g.addEventListener("focusout", function (e) { if (!g.contains(e.relatedTarget)) btn.setAttribute("aria-expanded", "false"); });
    g.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") { e.stopPropagation(); btn.setAttribute("aria-expanded", "false"); btn.focus(); }
    });
  });
  document.addEventListener("click", function (e) { if (!e.target.closest(".nav-group")) closeGroups(); });

  /* ---------- Current page in nav ---------- */
  var here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav a:not(.nav-cta), .footer-nav a").forEach(function (a) {
    if (a.getAttribute("href") !== here) return;
    a.setAttribute("aria-current", "page");
    var g = a.closest(".nav-group"); if (g) g.classList.add("is-current");
  });

  /* ---------- Header: deepen glass once content scrolls under it ---------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 8); };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); ro.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    reveals.forEach(function (el) { ro.observe(el); });
  }

  /* HiDPI fit */
  function fit(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, r.width * dpr);
    canvas.height = Math.max(1, r.height * dpr);
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: r.width, h: r.height };
  }

  /* =======================================================
     ABOUT — animated pentagon radar (data report)
     ======================================================= */
  (function radar() {
    var canvas = document.getElementById("radar-canvas");
    if (!canvas) return;
    var ctx, W, H, cx, cy, R;
    var labels = ["打力", "球速", "走力", "敏捷性", "体幹"];
    var target = [0.86, 0.72, 0.8, 0.66, 0.78];
    var N = 5, started = false, progress = reduce ? 1 : 0;
    // palette: the radar sits on a dark panel by default, on a light page section
    // when the canvas is marked data-theme="light" (measurement.html)
    var C = canvas.getAttribute("data-theme") === "light" ? {
      ring: "rgba(40,16,86,0.13)", ringEdge: "rgba(40,16,86,0.34)", tick: "rgba(60,56,80,0.55)",
      spoke: "rgba(40,16,86,0.13)", fill: "rgba(123,92,255,0.16)", line: "#7b5cff",
      glow: "rgba(123,92,255,0.35)", dot: "#7b5cff", dotCore: "#ffffff",
      label: "#1a0a42", value: "#6a47ff", caption: "rgba(60,56,80,0.6)", total: "#1a0a42"
    } : {
      ring: "rgba(255,255,255,0.1)", ringEdge: "rgba(255,255,255,0.3)", tick: "rgba(255,255,255,0.45)",
      spoke: "rgba(255,255,255,0.15)", fill: "rgba(25,212,255,0.18)", line: "#19d4ff",
      glow: "rgba(25,212,255,0.6)", dot: "#19d4ff", dotCore: "#1a0a42",
      label: "#ffffff", value: "#19d4ff", caption: "rgba(255,255,255,0.55)", total: "#ffffff"
    };

    function init() { var f = fit(canvas); ctx = f.ctx; W = f.w; H = f.h; cx = W / 2; cy = H / 2 + H * 0.02; R = Math.min(W, H) * 0.30; }
    function pt(i, rad) { var a = -Math.PI / 2 + (i / N) * Math.PI * 2; return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]; }
    function draw(prog) {
      ctx.clearRect(0, 0, W, H);
      var M = Math.min(W, H);
      // concentric guide rings
      for (var ring = 1; ring <= 5; ring++) {
        ctx.strokeStyle = ring === 5 ? C.ringEdge : C.ring;
        ctx.lineWidth = 1; ctx.beginPath();
        for (var i = 0; i <= N; i++) { var p = pt(i % N, R * ring / 5); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
        ctx.stroke();
      }
      // ring scale ticks along the top spoke (20..100)
      ctx.fillStyle = C.tick; ctx.font = "500 " + (M*0.026) + "px 'Inter Tight',sans-serif";
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      for (var t = 1; t <= 5; t++) { ctx.fillText(String(t*20), cx + 4, cy - R*t/5); }
      // spokes
      for (var s = 0; s < N; s++) {
        var e = pt(s, R); ctx.strokeStyle = C.spoke; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(e[0], e[1]); ctx.stroke();
      }
      // data polygon
      ctx.beginPath();
      for (var d = 0; d <= N; d++) { var idx = d % N, dp = pt(idx, R * target[idx] * prog); d ? ctx.lineTo(dp[0], dp[1]) : ctx.moveTo(dp[0], dp[1]); }
      ctx.closePath();
      ctx.fillStyle = C.fill; ctx.fill();
      ctx.strokeStyle = C.line; ctx.lineWidth = 2.4; ctx.shadowColor = C.glow; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;
      // vertices + per-axis value chips
      for (var v = 0; v < N; v++) {
        var vp = pt(v, R * target[v] * prog);
        ctx.fillStyle = C.dot; ctx.beginPath(); ctx.arc(vp[0], vp[1], M*0.012, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = C.dotCore; ctx.beginPath(); ctx.arc(vp[0], vp[1], M*0.005, 0, Math.PI*2); ctx.fill();
      }
      // axis names + score value just outside each vertex
      ctx.textAlign = "center";
      for (var n = 0; n < N; n++) {
        var lp = pt(n, R + M*0.085);
        ctx.fillStyle = C.label; ctx.font = "900 " + (M*0.036) + "px 'Noto Sans JP',sans-serif";
        ctx.fillText(labels[n], lp[0], lp[1]);
        ctx.fillStyle = C.value; ctx.font = "700 " + (M*0.034) + "px 'Inter Tight',sans-serif";
        ctx.fillText(Math.round(target[n]*100*prog), lp[0], lp[1] + M*0.046);
      }
      // center overall score
      var tot = 0; for (var k = 0; k < N; k++) tot += target[k];
      ctx.fillStyle = C.caption; ctx.font = "500 " + (M*0.03) + "px 'Inter Tight',sans-serif";
      ctx.fillText("OVERALL", cx, cy - M*0.055);
      ctx.fillStyle = C.total; ctx.font = "700 " + (M*0.085) + "px 'Inter Tight',sans-serif";
      ctx.fillText(Math.round(tot / N * 100 * prog), cx, cy + M*0.01);
    }
    function animate() { progress += (1 - progress) * 0.06; draw(progress); if (progress < 0.995) requestAnimationFrame(animate); else draw(1); }
    init(); draw(progress);
    addEventListener("resize", function () { init(); draw(started || reduce ? 1 : 0); });
    if (reduce) { draw(1); return; }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting && !started) { started = true; animate(); io.disconnect(); } });
      }, { threshold: 0.35 });
      io.observe(canvas);
    } else { started = true; animate(); }
  })();

  /* =======================================================
     Apply / inquiry forms -> compose a prefilled email
     ======================================================= */
  document.querySelectorAll("form.apply-form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var to = form.getAttribute("data-mailto") || "info@example.com";
      var subject = form.getAttribute("data-subject") || "お問い合わせ";
      var groups = {}; var order = [];
      form.querySelectorAll("input[name], select[name], textarea[name]").forEach(function (el) {
        var key = el.getAttribute("name");
        if (order.indexOf(key) === -1) order.push(key);
        if (el.type === "checkbox") { if (el.checked) (groups[key] = groups[key] || []).push(el.value); }
        else if (el.value.trim() !== "") { groups[key] = [el.value.trim()]; }
      });
      var lines = order.filter(function (k) { return groups[k]; })
        .map(function (k) { return "■ " + k + "\n" + groups[k].join("、"); });
      var body = "HAKI pro お申し込み・お問い合わせ\n\n" + lines.join("\n\n") +
        "\n\n----------------------------------------\nこのメールをそのまま送信してください。";
      window.location.href = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      var sent = form.querySelector(".form-sent");
      if (sent) sent.style.display = "block";
    });
  });

  (function motionLayer() {
  /* =======================================================
     MOTION LAYER — progressive enhancement, transform/opacity only.
     Everything here is skipped under prefers-reduced-motion.
     ======================================================= */
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var root = document.documentElement;
  root.classList.add("js");

  // Exponential follow: always continues from the live value, so any
  // new target re-aims mid-flight with no jump (interruptible).
  function follow(cur, target, dt, tau) { return cur + (target - cur) * (1 - Math.exp(-dt / tau)); }

  /* ---------- Mobile nav: stagger order ---------- */
  if (nav) nav.querySelectorAll(":scope > a, :scope > .nav-group").forEach(function (a, i) { a.style.setProperty("--i", i); });

  /* ---------- Scroll progress line + hide-on-scroll header ---------- */
  var bar = null;
  if (header) {
    bar = document.createElement("span");
    bar.className = "scroll-progress"; bar.setAttribute("aria-hidden", "true");
    header.appendChild(bar);
  }
  var reserve = document.querySelector(".reserve");
  var footer = document.querySelector(".site-footer");
  var lastY = window.scrollY, ticking = false, footerIn = false;
  if (reserve && footer && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { footerIn = es[0].isIntersecting; update(); }, { threshold: 0 }).observe(footer);
  }
  function update() {
    ticking = false;
    var y = window.scrollY, max = Math.max(1, root.scrollHeight - innerHeight);
    if (bar) bar.style.transform = "scaleX(" + Math.min(1, y / max).toFixed(4) + ")";
    if (!reduce && header && !root.classList.contains("nav-open")) {
      var dy = y - lastY;
      if (y < 240 || dy < -6) root.classList.remove("hdr-hide");
      else if (dy > 6) root.classList.add("hdr-hide");
    }
    if (reserve) reserve.classList.toggle("show", y > innerHeight * 0.6 && !footerIn);
    lastY = y;
  }
  addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();

  if (reduce) return;

  /* ---------- Hero headline: characters materialize ---------- */
  var h1 = document.querySelector(".hero-message");
  if (h1) {
    var n = 0;
    Array.prototype.slice.call(h1.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        var frag = document.createDocumentFragment();
        Array.from(node.textContent).forEach(function (c) {
          if (!c.trim()) { frag.appendChild(document.createTextNode(c)); return; }
          var s = document.createElement("span"); s.className = "ch"; s.textContent = c;
          s.style.setProperty("--i", n++); frag.appendChild(s);
        });
        h1.replaceChild(frag, node);
      } else if (node.classList && node.classList.contains("accent")) {
        // gradient text must stay one unit, or the gradient restarts per glyph
        node.classList.add("ch"); node.style.setProperty("--i", n++ + 1);
      }
    });
    h1.setAttribute("aria-label", h1.textContent.replace(/\s+/g, ""));
    h1.classList.add("is-split");
  }

  /* ---------- Big EN headings: mask reveal ---------- */
  var masks = document.querySelectorAll(".bighead .en, .page-hero .en, .sec-head h2, .phil-statement, .mvv-headline");
  /* ---------- Grids: stagger children ---------- */
  var groups = document.querySelectorAll(".feature-grid, .spec-grid, .phil-grid, .diamonds, .price-grid, .flow-row, .value-list, .news-rows, .info-table, .split");
  groups.forEach(function (g) {
    g.classList.remove("reveal", "d1", "d2", "d3", "in");
    Array.prototype.forEach.call(g.children, function (c, i) {
      c.classList.remove("d1", "d2", "d3");
      c.classList.add("reveal"); c.style.setProperty("--i", i);
    });
  });
  if ("IntersectionObserver" in window) {
    // watch the parent: the mask's own clip-path hides it from the observer, so it never fires
    var maskOf = new Map();
    var mo = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        maskOf.get(en.target).forEach(function (m) { m.classList.add("is-in"); });
        mo.unobserve(en.target);
      });
    }, { threshold: 0, rootMargin: "0px 0px -8% 0px" });
    masks.forEach(function (m) {
      var p = m.parentElement;
      m.classList.add("mask");
      if (!maskOf.has(p)) { maskOf.set(p, []); mo.observe(p); }
      maskOf.get(p).push(m);
    });
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); so.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    groups.forEach(function (g) { Array.prototype.forEach.call(g.children, function (c) { so.observe(c); }); });
  }

  if (!fine) return;

  /* ---------- Spotlight on dark cards (pointer devices only) ---------- */
  document.querySelectorAll(".price-card, .split-panel, .diamond, .contact-panel").forEach(function (card) {
    var spot = document.createElement("span");
    spot.className = "spot"; spot.setAttribute("aria-hidden", "true");
    card.appendChild(spot);
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      spot.style.transform = "translate3d(" + (e.clientX - r.left) + "px," + (e.clientY - r.top) + "px,0)";
    });
  });

  /* ---------- Program tiles: gentle 3D tilt toward the pointer ---------- */
  document.querySelectorAll(".diamond").forEach(function (el) {
    var cx = 0, cy = 0, tx = 0, ty = 0, lift = 0, tl = 0, raf = 0, last = 0;
    function frame(t) {
      var dt = Math.min(48, t - (last || t)); last = t;
      cx = follow(cx, tx, dt, 90); cy = follow(cy, ty, dt, 90); lift = follow(lift, tl, dt, 110);
      el.style.transform = "perspective(900px) translate3d(0," + (-6 * lift).toFixed(2) + "px,0) rotateX(" + cy.toFixed(2) + "deg) rotateY(" + cx.toFixed(2) + "deg)";
      if (Math.abs(cx - tx) + Math.abs(cy - ty) + Math.abs(lift - tl) > 0.01) raf = requestAnimationFrame(frame);
      else { raf = 0; last = 0; if (!tl) el.style.transform = ""; }
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 8;
      ty = -((e.clientY - r.top) / r.height - 0.5) * 8;
      tl = 1; kick();
    });
    el.addEventListener("pointerleave", function () { tx = ty = 0; tl = 0; kick(); });
  });

  /* ---------- Hero: pointer-led light + PUMPS mark parallax ---------- */
  var hero = document.querySelector(".hero");
  if (hero) {
    var glow = document.createElement("div");
    glow.className = "hero-glow"; glow.setAttribute("aria-hidden", "true");
    hero.insertBefore(glow, hero.firstChild);
    var mark = hero.querySelector(".hero-mark");
    var gx = 0.72, gy = 0.3, tgx = 0.72, tgy = 0.3, hraf = 0, hlast = 0;
    function hframe(t) {
      var dt = Math.min(48, t - (hlast || t)); hlast = t;
      gx = follow(gx, tgx, dt, 260); gy = follow(gy, tgy, dt, 260);
      var w = hero.clientWidth, h = hero.clientHeight;
      glow.style.transform = "translate3d(" + (gx * w).toFixed(1) + "px," + (gy * h).toFixed(1) + "px,0)";
      if (mark) mark.style.transform = "translate(" + ((0.5 - gx) * -18).toFixed(2) + "px, calc(-50% + " + ((0.5 - gy) * -14 + window.scrollY * 0.12).toFixed(2) + "px))";
      if (Math.abs(gx - tgx) + Math.abs(gy - tgy) > 0.0005) hraf = requestAnimationFrame(hframe); else { hraf = 0; hlast = 0; }
    }
    function hkick() { if (!hraf) hraf = requestAnimationFrame(hframe); }
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      tgx = (e.clientX - r.left) / r.width; tgy = (e.clientY - r.top) / r.height; hkick();
    });
    hero.addEventListener("pointerleave", function () { tgx = 0.72; tgy = 0.3; hkick(); });
    addEventListener("scroll", function () { if (window.scrollY < hero.offsetHeight) hkick(); }, { passive: true });
    hkick();
  }
  })();

})();
