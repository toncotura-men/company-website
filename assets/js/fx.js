/* =========================================================
   fx.js — トップページ用の動き（PUMPS・HERO's CUP 共通。heros-cup/assets/js/fx.js は同じ中身の写し）
   ・[data-split]     見出しを1文字ずつ下から出す
   ・[data-clip]      写真・面を幕を開けるように出す
   ・[data-speed]     スクロールに合わせて奥行きのようにずらす（パララックス）
   ・[data-magnetic]  ボタンがカーソルに吸い付く
   ・[data-count]     数字が数え上がる（data-comma で 3桁区切り）
   ・[data-spot]      光がカーソルについてくる（CSS の --mx / --my）
   ・[data-scrub]     スクロールに合わせて文字が1つずつ明るくなる
   ・[data-hscroll]   縦スクロールで横に流れる（パソコンのみ。スマホは指で横に送る）
   ・[data-marquee]   流れる文字。スクロールの速さで勢いが変わる
   ・[data-countdown] 指定日までの日数
   ・[data-tilt]      カーソルの位置で少し傾く
   ・.fx-in          画面に入ったら付く（CSS 側で出方を決める）
   動きは transform / opacity / clip-path だけ。動きを減らす設定ではすべて最後の状態で止める。
   ========================================================= */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  document.documentElement.classList.add("fx-ready");
  if (reduce) document.documentElement.classList.add("fx-reduce");

  /* ---------- 見出しを1文字ずつ ---------- */
  $$("[data-split]").forEach(function (el) {
    var i = 0;
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          Array.from(n.textContent).forEach(function (ch) {
            if (ch === "\n" || ch === "​") { frag.appendChild(document.createTextNode(ch)); return; }
            var o = document.createElement("span"); o.className = "fx-ch";
            var s = document.createElement("span"); s.textContent = ch; s.style.setProperty("--ci", i++);
            o.appendChild(s); frag.appendChild(o);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
      });
    };
    var label = el.textContent.replace(/\s+/g, " ").trim();
    walk(el);
    el.setAttribute("aria-label", label);
    $$(".fx-ch", el).forEach(function (c) { c.setAttribute("aria-hidden", "true"); });
  });

  /* ---------- 指定日までの日数 ---------- */
  $$("[data-countdown]").forEach(function (el) {
    var d = new Date(el.dataset.countdown + "T00:00:00+09:00");
    var days = Math.ceil((d - new Date()) / 86400000);
    if (days < 0) { var box = el.closest("[data-countdown-box]"); if (box) box.hidden = true; return; }
    el.dataset.count = String(days);
    el.textContent = reduce ? String(days) : "0";
  });

  /* ---------- 画面に入ったら .fx-in ---------- */
  var inTargets = $$("[data-split], [data-clip], [data-in], [data-count], [data-hscroll], .fx-reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    inTargets.forEach(function (el) { el.classList.add("fx-in"); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (e.target._clipKid) e.target._clipKid.classList.add("fx-in");
        else e.target.classList.add("fx-in");
        io.unobserve(e.target);
        if (e.target.hasAttribute("data-count")) countUp(e.target);
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    /* 幕で隠れている要素は、隠れたままだと見えている判定にならないことがあるので、親の位置で判定する */
    inTargets.forEach(function (el) {
      if (el.hasAttribute("data-clip") && el.parentElement) { el.parentElement._clipKid = el; io.observe(el.parentElement); }
      else io.observe(el);
    });
    /* 最初の画面の分はすぐ出す */
    requestAnimationFrame(function () {
      $$(".fx-hero [data-split], .fx-hero [data-in], .fx-hero [data-clip]").forEach(function (el) { el.classList.add("fx-in"); });
    });
  }

  /* ---------- 数字が数え上がる ---------- */
  function fmt(v, el) {
    var dec = (el.dataset.count.split(".")[1] || "").length;
    var s = v.toFixed(dec);
    if (el.hasAttribute("data-comma")) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return s;
  }
  function countUp(el) {
    var to = parseFloat(el.dataset.count);
    if (reduce) { el.textContent = fmt(to, el); return; }
    var t0 = performance.now(), dur = parseFloat(el.dataset.dur || "1600");
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur), k = p >= 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = fmt(to * k, el);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  if (reduce) $$("[data-count]").forEach(function (el) { el.textContent = fmt(parseFloat(el.dataset.count), el); });

  /* ---------- 光がカーソルについてくる・ボタンが吸い付く・少し傾く ---------- */
  if (fine && !reduce) {
    $$("[data-spot]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (e.clientX - r.left) + "px");
        el.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
    $$("[data-magnetic]").forEach(function (el) {
      var s = parseFloat(el.dataset.magnetic || "0.3");
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.transform = "translate(" + (e.clientX - r.left - r.width / 2) * s + "px," + (e.clientY - r.top - r.height / 2) * s + "px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
    $$("[data-tilt]").forEach(function (el) {
      var max = parseFloat(el.dataset.tilt || "8");
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = "perspective(900px) rotateX(" + (-y * max) + "deg) rotateY(" + (x * max) + "deg)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------- スクロールに合わせて動くもの（画面に見えている間だけ計算） ---------- */
  var parallax = reduce ? [] : $$("[data-speed]");
  var scrubs = $$("[data-scrub]");
  var hs = $$("[data-hscroll]");
  var marquees = $$("[data-marquee]");

  scrubs.forEach(function (el) {
    var text = el.textContent; el.textContent = ""; el.setAttribute("aria-label", text.trim());
    Array.from(text).forEach(function (ch) {
      var s = document.createElement("span"); s.className = "fx-w"; s.textContent = ch; s.setAttribute("aria-hidden", "true"); el.appendChild(s);
    });
  });

  var wide = function () { return window.innerWidth >= 1024; };
  hs.forEach(function (sec) {
    sec._track = sec.querySelector("[data-hscroll-track]");
    sec._bar = sec.querySelector("[data-hscroll-bar]");
  });
  function sizeH() {
    hs.forEach(function (sec) {
      if (!sec._track) return;
      if (!wide() || reduce) { sec.style.height = ""; sec._dist = 0; sec._track.style.transform = ""; return; }
      var dist = Math.max(0, sec._track.scrollWidth - window.innerWidth + 48);
      sec._dist = dist;
      sec.style.height = (window.innerHeight + dist) + "px";
    });
  }

  marquees.forEach(function (m) { m._x = 0; m._track = m.firstElementChild; });
  var lastY = window.scrollY, vel = 0, ticking = false, lastT = performance.now();

  function frame(now) {
    ticking = false;
    var y = window.scrollY, vh = window.innerHeight;
    var dt = Math.min(64, now - lastT); lastT = now;
    vel = vel * 0.9 + (y - lastY) * 0.1; lastY = y;

    parallax.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var c = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.transform = "translate3d(0," + (c * parseFloat(el.dataset.speed) * -100).toFixed(1) + "px,0)";
    });

    scrubs.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var p = clamp((vh * 0.85 - r.top) / (vh * 0.6), 0, 1);
      var ws = el.children, n = ws.length, on = Math.round(p * n);
      for (var i = 0; i < n; i++) ws[i].classList.toggle("on", i < on);
    });

    hs.forEach(function (sec) {
      if (!sec._dist) return;
      var r = sec.getBoundingClientRect();
      var p = clamp(-r.top / Math.max(1, sec._dist), 0, 1);
      sec._track.style.transform = "translate3d(" + (-p * sec._dist).toFixed(1) + "px,0,0)";
      if (sec._bar) sec._bar.style.transform = "scaleX(" + p.toFixed(3) + ")";
    });

    if (!reduce) marquees.forEach(function (m) {
      var r = m.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var w = m._track.scrollWidth / 2 || 1;
      m._x -= (0.04 + Math.min(1.2, Math.abs(vel) * 0.02)) * dt * (parseFloat(m.dataset.marquee) || 1);
      if (m._x <= -w) m._x += w;
      m._track.style.transform = "translate3d(" + m._x.toFixed(1) + "px,0,0)";
    });

    if (!reduce && marquees.length) request();
  }
  function request() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  addEventListener("scroll", request, { passive: true });
  addEventListener("resize", function () { sizeH(); request(); });
  addEventListener("load", function () { sizeH(); request(); });
  sizeH(); request();
})();
