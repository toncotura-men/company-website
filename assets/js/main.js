/* =========================================================
   PUMPS — Arrowz-Lab style interactions & canvas art
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
      if (e.target.closest("a")) { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("in"); });
  } else {
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); ro.unobserve(en.target); } });
    }, { threshold: 0.16 });
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
     NETWORK CONSTELLATION — the purple/lime node texture
     Runs on every <canvas class="net-canvas" data-color="r,g,b">
     ======================================================= */
  function constellation(canvas) {
    var color = canvas.getAttribute("data-color") || "180,150,255";
    var ctx, W, H, nodes = [], raf;
    function build() {
      var f = fit(canvas); ctx = f.ctx; W = f.w; H = f.h;
      var n = Math.round(Math.min(70, (W * H) / 13000));
      nodes = [];
      for (var i = 0; i < n; i++) {
        nodes.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
          r: 0.8 + Math.random() * 1.8
        });
      }
    }
    function step() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < nodes.length; i++) {
        var p = nodes[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }
      // links
      for (var a = 0; a < nodes.length; a++) {
        for (var b = a + 1; b < nodes.length; b++) {
          var dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y;
          var d2 = dx * dx + dy * dy;
          if (d2 < 16000) {
            var al = (1 - d2 / 16000) * 0.5;
            ctx.strokeStyle = "rgba(" + color + "," + al + ")";
            ctx.lineWidth = 0.7;
            ctx.beginPath(); ctx.moveTo(nodes[a].x, nodes[a].y); ctx.lineTo(nodes[b].x, nodes[b].y); ctx.stroke();
          }
        }
      }
      // nodes
      for (var k = 0; k < nodes.length; k++) {
        var q = nodes[k];
        ctx.fillStyle = "rgba(" + color + ",0.9)";
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(step);
    }
    build();
    if (reduce) { step(); cancelAnimationFrame(raf); } else step();
    addEventListener("resize", function () { cancelAnimationFrame(raf); build(); if (!reduce) step(); else step(); });
  }
  document.querySelectorAll(".net-canvas").forEach(constellation);

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

    function init() { var f = fit(canvas); ctx = f.ctx; W = f.w; H = f.h; cx = W / 2; cy = H / 2 + H * 0.02; R = Math.min(W, H) * 0.30; }
    function pt(i, rad) { var a = -Math.PI / 2 + (i / N) * Math.PI * 2; return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]; }
    function draw(prog) {
      ctx.clearRect(0, 0, W, H);
      var M = Math.min(W, H);
      // concentric guide rings (light, for white background)
      for (var ring = 1; ring <= 5; ring++) {
        ctx.strokeStyle = ring === 5 ? "rgba(20,18,31,0.22)" : "rgba(20,18,31,0.08)";
        ctx.lineWidth = 1; ctx.beginPath();
        for (var i = 0; i <= N; i++) { var p = pt(i % N, R * ring / 5); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
        ctx.stroke();
      }
      // ring scale ticks along the top spoke (20..100)
      ctx.fillStyle = "rgba(20,18,31,0.32)"; ctx.font = "500 " + (M*0.026) + "px 'Oswald',sans-serif";
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      for (var t = 1; t <= 5; t++) { ctx.fillText(String(t*20), cx + 4, cy - R*t/5); }
      // spokes
      for (var s = 0; s < N; s++) {
        var e = pt(s, R); ctx.strokeStyle = "rgba(20,18,31,0.12)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(e[0], e[1]); ctx.stroke();
      }
      // data polygon
      ctx.beginPath();
      for (var d = 0; d <= N; d++) { var idx = d % N, dp = pt(idx, R * target[idx] * prog); d ? ctx.lineTo(dp[0], dp[1]) : ctx.moveTo(dp[0], dp[1]); }
      ctx.closePath();
      ctx.fillStyle = "rgba(25,160,233,0.16)"; ctx.fill();
      ctx.strokeStyle = "#19a0e9"; ctx.lineWidth = 2.4; ctx.shadowColor = "rgba(25,160,233,0.5)"; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;
      // vertices + per-axis value chips
      for (var v = 0; v < N; v++) {
        var vp = pt(v, R * target[v] * prog);
        ctx.fillStyle = "#19a0e9"; ctx.beginPath(); ctx.arc(vp[0], vp[1], M*0.012, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(vp[0], vp[1], M*0.005, 0, Math.PI*2); ctx.fill();
      }
      // axis names (dark) + score value (cyan) just outside each vertex
      ctx.textAlign = "center";
      for (var n = 0; n < N; n++) {
        var lp = pt(n, R + M*0.085);
        ctx.fillStyle = "#15121f"; ctx.font = "900 " + (M*0.036) + "px 'Noto Sans JP',sans-serif";
        ctx.fillText(labels[n], lp[0], lp[1]);
        ctx.fillStyle = "#0f86c4"; ctx.font = "700 " + (M*0.034) + "px 'Oswald',sans-serif";
        ctx.fillText(Math.round(target[n]*100*prog), lp[0], lp[1] + M*0.046);
      }
      // center overall score
      var tot = 0; for (var k = 0; k < N; k++) tot += target[k];
      ctx.fillStyle = "rgba(15,18,31,0.42)"; ctx.font = "500 " + (M*0.03) + "px 'Oswald',sans-serif";
      ctx.fillText("OVERALL", cx, cy - M*0.055);
      ctx.fillStyle = "#15121f"; ctx.font = "700 " + (M*0.085) + "px 'Oswald',sans-serif";
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
      var body = "PUMPS お申し込み・お問い合わせ\n\n" + lines.join("\n\n") +
        "\n\n----------------------------------------\nこのメールをそのまま送信してください。";
      window.location.href = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      var sent = form.querySelector(".form-sent");
      if (sent) sent.style.display = "block";
    });
  });

})();
