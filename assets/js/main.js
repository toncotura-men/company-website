/* PUMPS site — interactions
   1) rAF floating baseball-player silhouettes in hero
   2) GSAP ScrollTrigger reveals
   3) Pinned recycle process: scroll rotates the 3D baseball + highlights steps */
(function () {
  "use strict";

  /* ---------- Nav ---------- */
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Hero floating silhouettes (requestAnimationFrame) ---------- */
  (function heroFloat() {
    const canvas = document.getElementById("hero-canvas");
    if (!canvas || reduced) return;
    const ctx = canvas.getContext("2d");
    const srcs = ["bat", "throw", "run"].map((n) => `assets/img/silhouette-${n}.svg`);
    const sprites = [];
    let ready = 0;

    srcs.forEach((src) => {
      const img = new Image();
      img.onload = () => { sprites.push(tint(img)); ready++; };
      img.src = src;
    });

    // Recolor black SVG into a faint blue sprite so it reads on the dark hero
    function tint(img) {
      const off = document.createElement("canvas");
      off.width = 200; off.height = 300;
      const o = off.getContext("2d");
      o.drawImage(img, 0, 0, 200, 300);
      o.globalCompositeOperation = "source-in";
      o.fillStyle = "rgba(120,180,255,1)";
      o.fillRect(0, 0, 200, 300);
      return off;
    }

    let W, H, parts = [];
    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener("resize", resize);
    resize();

    function spawn(initial) {
      const scale = 0.28 + Math.random() * 0.5;
      return {
        x: Math.random() * W,
        y: initial ? Math.random() * H : H + 120,
        s: scale,
        spr: Math.floor(Math.random() * 3),
        speed: 0.18 + Math.random() * 0.4,
        sway: 18 + Math.random() * 40,
        phase: Math.random() * Math.PI * 2,
        rot: (Math.random() - 0.5) * 0.4,
        vr: (Math.random() - 0.5) * 0.004,
        alpha: 0.05 + Math.random() * 0.10,
      };
    }
    for (let i = 0; i < 9; i++) parts.push(spawn(true));

    function frame(t) {
      requestAnimationFrame(frame);
      if (ready < 3) { ctx.clearRect(0, 0, W, H); return; }
      ctx.clearRect(0, 0, W, H);
      parts.forEach((p) => {
        p.y -= p.speed;
        p.rot += p.vr;
        const x = p.x + Math.sin(t * 0.0006 + p.phase) * p.sway;
        const w = 200 * p.s, h = 300 * p.s;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(x, p.y);
        ctx.rotate(p.rot);
        ctx.drawImage(sprites[p.spr], -w / 2, -h / 2, w, h);
        ctx.restore();
        if (p.y < -h) Object.assign(p, spawn(false));
      });
    }
    requestAnimationFrame(frame);
  })();

  /* ---------- GSAP ScrollTrigger ---------- */
  function initGSAP() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    if (!reduced) {
      gsap.utils.toArray(".reveal").forEach((el) => {
        gsap.from(el, {
          opacity: 0, y: 36, duration: 0.8, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
        });
      });

      gsap.utils.toArray(".biz-card").forEach((el, i) => {
        gsap.from(el, {
          opacity: 0, y: 50, duration: 0.7, delay: i * 0.08, ease: "power3.out",
          scrollTrigger: { trigger: ".biz-grid", start: "top 78%" },
        });
      });
    }

    /* Pinned recycle process: scroll spins the 3D ball + advances steps */
    const steps = gsap.utils.toArray(".process-step");
    const fill = document.getElementById("process-fill");
    const sticky = document.querySelector(".process-sticky");
    const section = document.getElementById("process");
    if (sticky && section) {
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "+=2400",
        pin: sticky,
        scrub: 0.6,
        onUpdate: (self) => {
          const p = self.progress;
          if (window.PUMPSBaseball) window.PUMPSBaseball.setProgress(p);
          if (fill) fill.style.width = (p * 100).toFixed(1) + "%";
          const active = Math.min(steps.length - 1, Math.floor(p * steps.length));
          steps.forEach((s, i) => s.classList.toggle("active", i === active));
        },
      });
    }
    ScrollTrigger.refresh();
  }

  if (document.readyState === "complete") initGSAP();
  else window.addEventListener("load", initGSAP);
})();
