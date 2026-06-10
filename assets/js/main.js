/* =========================================================
   PUMPS — interactions & self-made canvas animations
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
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if (reduce) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.16 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* HiDPI canvas helper */
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
     HERO — diagonal motion field of particles + streaks
     ======================================================= */
  (function heroCanvas() {
    var canvas = document.getElementById("hero-canvas");
    if (!canvas) return;
    var ctx, W, H, parts = [];
    var RED = "rgba(230,0,38,";
    var WHITE = "rgba(255,255,255,";
    var ang = -0.5, dx = Math.cos(ang), dy = Math.sin(ang);

    function spawn() {
      return {
        x: Math.random() * W, y: Math.random() * H,
        len: 14 + Math.random() * 60,
        spd: 0.6 + Math.random() * 2.4,
        a: 0.06 + Math.random() * 0.28,
        red: Math.random() < 0.28, r: 0.6 + Math.random() * 1.6
      };
    }
    function init() {
      var f = fit(canvas); ctx = f.ctx; W = f.w; H = f.h;
      var n = Math.round(Math.min(120, (W * H) / 11000));
      parts = [];
      for (var i = 0; i < n; i++) parts.push(spawn());
    }
    function drawParticle(p) {
      ctx.strokeStyle = (p.red ? RED : WHITE) + p.a + ")";
      ctx.lineWidth = p.r;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - dx * p.len, p.y - dy * p.len);
      ctx.stroke();
    }
    function frame() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      var g = ctx.createRadialGradient(W * 0.7, H * 0.3, 0, W * 0.7, H * 0.3, W * 0.8);
      g.addColorStop(0, "rgba(230,0,38,0.10)");
      g.addColorStop(1, "rgba(230,0,38,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += dx * p.spd * 1.6;
        p.y += dy * p.spd * 1.6;
        if (p.x > W + 80 || p.y < -80) { Object.assign(p, spawn()); p.x = -40; p.y = H + Math.random() * 40; }
        drawParticle(p);
      }
      raf = requestAnimationFrame(frame);
    }
    var raf;
    init();
    if (!reduce) { frame(); }
    else { ctx.clearRect(0, 0, W, H); parts.forEach(drawParticle); }
    addEventListener("resize", function () { cancelAnimationFrame(raf); init(); if (!reduce) frame(); });
  })();

  /* =======================================================
     CONCEPT — EKG / signal waveform ("the body speaks data")
     ======================================================= */
  (function pulseCanvas() {
    var canvas = document.getElementById("pulse-canvas");
    if (!canvas) return;
    var ctx, W, H, t = 0, raf;
    function init() { var f = fit(canvas); ctx = f.ctx; W = f.w; H = f.h; }
    function wave(x, phase) {
      var mid = H * 0.5;
      var base = Math.sin((x * 0.025) + phase) * H * 0.10
               + Math.sin((x * 0.06) + phase * 1.7) * H * 0.05;
      var k = (x + phase * 30) % W;
      var beat = Math.exp(-Math.pow((k - W * 0.5) / 8, 2)) * -H * 0.32
               + Math.exp(-Math.pow((k - W * 0.5 - 12) / 6, 2)) * H * 0.18;
      return mid + base + beat;
    }
    function grid() {
      ctx.strokeStyle = "rgba(20,22,28,0.06)"; ctx.lineWidth = 1;
      for (var gx = 0; gx < W; gx += 24) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
      for (var gy = 0; gy < H; gy += 24) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
    }
    function frame() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      grid();
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(230,0,38,0.9)";
      ctx.shadowColor = "rgba(230,0,38,0.6)"; ctx.shadowBlur = 8;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (var x = 0; x <= W; x += 2) {
        var yv = wave(x, t);
        x === 0 ? ctx.moveTo(x, yv) : ctx.lineTo(x, yv);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      var lead = wave(W - 2, t);
      ctx.fillStyle = "#e60026";
      ctx.beginPath(); ctx.arc(W - 2, lead, 3.2, 0, Math.PI * 2); ctx.fill();
      t += 0.05;
      raf = requestAnimationFrame(frame);
    }
    init();
    if (!reduce) frame(); else { grid(); }
    addEventListener("resize", function () { cancelAnimationFrame(raf); init(); if (!reduce) frame(); else grid(); });
  })();

  /* =======================================================
     ABILITIES — animated pentagon radar chart
     ======================================================= */
  (function radarCanvas() {
    var canvas = document.getElementById("radar-canvas");
    if (!canvas) return;
    var ctx, W, H, cx, cy, R;
    var labels = ["打力", "球速", "走力", "敏捷性", "体幹"];
    var target = [0.86, 0.74, 0.8, 0.68, 0.78];
    var N = 5, started = false, progress = 0;

    function init() {
      var f = fit(canvas); ctx = f.ctx; W = f.w; H = f.h;
      cx = W / 2; cy = H / 2 + 6; R = Math.min(W, H) * 0.34;
    }
    function pt(i, rad) {
      var a = -Math.PI / 2 + (i / N) * Math.PI * 2;
      return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
    }
    function draw(prog) {
      ctx.clearRect(0, 0, W, H);
      for (var ring = 1; ring <= 4; ring++) {
        ctx.strokeStyle = "rgba(20,22,28,0.10)"; ctx.lineWidth = 1;
        ctx.beginPath();
        for (var i = 0; i <= N; i++) { var p = pt(i % N, R * ring / 4); i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]); }
        ctx.stroke();
      }
      ctx.fillStyle = "#14161c";
      ctx.font = "700 13px 'Noto Sans JP', sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (var s = 0; s < N; s++) {
        var e = pt(s, R);
        ctx.strokeStyle = "rgba(20,22,28,0.12)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(e[0], e[1]); ctx.stroke();
        var lp = pt(s, R + 20);
        ctx.fillText(labels[s], lp[0], lp[1]);
      }
      ctx.beginPath();
      for (var d = 0; d <= N; d++) {
        var idx = d % N, val = target[idx] * prog, dp = pt(idx, R * val);
        d === 0 ? ctx.moveTo(dp[0], dp[1]) : ctx.lineTo(dp[0], dp[1]);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(230,0,38,0.18)"; ctx.fill();
      ctx.strokeStyle = "rgba(230,0,38,0.95)"; ctx.lineWidth = 2.4; ctx.stroke();
      for (var v = 0; v < N; v++) {
        var vp = pt(v, R * target[v] * prog);
        ctx.fillStyle = "#e60026";
        ctx.beginPath(); ctx.arc(vp[0], vp[1], 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(vp[0], vp[1], 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    function animate() {
      progress += (1 - progress) * 0.06;
      draw(progress);
      if (progress < 0.995) requestAnimationFrame(animate); else draw(1);
    }
    init();
    draw(reduce ? 1 : 0);
    addEventListener("resize", function () { init(); draw(started || reduce ? 1 : 0); });
    if (reduce) { draw(1); return; }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) {
          if (en.isIntersecting && !started) { started = true; animate(); io.disconnect(); }
        });
      }, { threshold: 0.4 });
      io.observe(canvas);
    } else { started = true; animate(); }
  })();

})();
