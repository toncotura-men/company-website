/* 硬式球の3Dモデル — Three.js（リアルなレザー質感＋赤い二重ステッチ＋凹凸）
   - カーソル/タッチのドラッグで360度回転
   - スクロール連動回転用に window.PUMPSBaseball.setProgress() を公開 */
(function () {
  if (!window.THREE) { console.warn("[baseball] THREE not loaded"); return; }
  const mount = document.getElementById("baseball-canvas");
  if (!mount) return;

  const sizeOf = () => ({ w: mount.clientWidth || 400, h: mount.clientHeight || 400 });

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  cam.position.set(0, 0, 3.3);

  const renderer = new THREE.WebGLRenderer({ canvas: mount, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Lighting tuned for leather realism
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.05); key.position.set(4, 5, 6); scene.add(key);
  const fill = new THREE.DirectionalLight(0xbcd4ff, 0.45); fill.position.set(-5, 1, 3); scene.add(fill);
  const rim = new THREE.DirectionalLight(0x38bdf8, 0.55); rim.position.set(-3, -2, -5); scene.add(rim);

  /* ---- Procedural baseball maps (color + bump) on equirectangular canvas ---- */
  const TW = 2048, TH = 1024;

  // seam path: two complementary sine curves across the map
  function seamY(xt, phase) { return TH * 0.5 + TH * 0.27 * Math.sin(xt * Math.PI * 2 + phase); }

  function drawStitches(ctx, phase, color, scale) {
    // double row of slanted red stitches forming the classic baseball "ladder"
    const N = 230;
    ctx.lineCap = "round";
    for (let i = 0; i <= N; i++) {
      const xt = i / N;
      const X = xt * TW;
      const Y = seamY(xt, phase);
      // tangent
      const dY = TH * 0.27 * Math.cos(xt * Math.PI * 2 + phase) * (Math.PI * 2) / TW;
      const len = Math.hypot(1, dY) || 1;
      const tx = 1 / len, ty = dY / len;     // tangent (per px)
      const nx = -ty, ny = tx;               // normal
      const gap = 17 * scale;                // distance of each row from seam center
      const stitch = 15 * scale;             // stitch length
      const slant = 0.55;                    // slant along tangent
      ctx.strokeStyle = color;
      ctx.lineWidth = 4.2 * scale;
      // upper row stitch ( "/" )
      let cx = X + nx * gap, cy = Y + ny * gap;
      ctx.beginPath();
      ctx.moveTo(cx - tx * stitch * slant - nx * stitch * 0.5, cy - ty * stitch * slant - ny * stitch * 0.5);
      ctx.lineTo(cx + tx * stitch * slant + nx * stitch * 0.5, cy + ty * stitch * slant + ny * stitch * 0.5);
      ctx.stroke();
      // lower row stitch ( "\" mirrored ) — offset half-step for staggered look
      const xt2 = (i + 0.5) / N;
      const X2 = xt2 * TW, Y2 = seamY(xt2, phase);
      cx = X2 - nx * gap; cy = Y2 - ny * gap;
      ctx.beginPath();
      ctx.moveTo(cx - tx * stitch * slant + nx * stitch * 0.5, cy - ty * stitch * slant + ny * stitch * 0.5);
      ctx.lineTo(cx + tx * stitch * slant - nx * stitch * 0.5, cy + ty * stitch * slant - ny * stitch * 0.5);
      ctx.stroke();
    }
  }

  function makeColorMap() {
    const c = document.createElement("canvas"); c.width = TW; c.height = TH;
    const x = c.getContext("2d");
    // leather base with soft vertical shading
    const g = x.createLinearGradient(0, 0, 0, TH);
    g.addColorStop(0, "#efe9dc");
    g.addColorStop(0.5, "#f6f2e9");
    g.addColorStop(1, "#e7dfce");
    x.fillStyle = g; x.fillRect(0, 0, TW, TH);
    // fine leather grain
    for (let i = 0; i < 24000; i++) {
      const a = Math.random() * 0.05;
      x.fillStyle = (Math.random() < 0.5 ? "rgba(120,108,86," : "rgba(255,255,255,") + a + ")";
      x.fillRect(Math.random() * TW, Math.random() * TH, 2, 2);
    }
    // faint seam shadow channel under stitches
    [0, Math.PI].forEach((ph) => {
      x.strokeStyle = "rgba(150,120,90,0.30)"; x.lineWidth = 26;
      x.beginPath();
      for (let i = 0; i <= 240; i++) { const xt = i / 240; const X = xt * TW, Y = seamY(xt, ph); i ? x.lineTo(X, Y) : x.moveTo(X, Y); }
      x.stroke();
    });
    // red stitches
    drawStitches(x, 0, "#b41d20", 1);
    drawStitches(x, Math.PI, "#a81a1d", 1);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 8;
    if ("colorSpace" in t) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function makeBumpMap() {
    const c = document.createElement("canvas"); c.width = TW; c.height = TH;
    const x = c.getContext("2d");
    x.fillStyle = "#808080"; x.fillRect(0, 0, TW, TH); // neutral height
    // grain
    for (let i = 0; i < 16000; i++) {
      const v = 128 + (Math.random() - 0.5) * 26;
      x.fillStyle = `rgb(${v|0},${v|0},${v|0})`;
      x.fillRect(Math.random() * TW, Math.random() * TH, 2, 2);
    }
    // seam groove (dark = recessed)
    [0, Math.PI].forEach((ph) => {
      x.strokeStyle = "#4a4a4a"; x.lineWidth = 10;
      x.beginPath();
      for (let i = 0; i <= 240; i++) { const xt = i / 240; const X = xt * TW, Y = seamY(xt, ph); i ? x.lineTo(X, Y) : x.moveTo(X, Y); }
      x.stroke();
    });
    // stitches raised (bright)
    drawStitches(x, 0, "#f2f2f2", 1);
    drawStitches(x, Math.PI, "#f2f2f2", 1);
    return new THREE.CanvasTexture(c);
  }

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(1, 160, 160),
    new THREE.MeshStandardMaterial({
      map: makeColorMap(),
      bumpMap: makeBumpMap(),
      bumpScale: 0.012,
      roughness: 0.52,
      metalness: 0.0,
    })
  );
  ball.rotation.x = 0.35;
  scene.add(ball);

  function resize() {
    const { w, h } = sizeOf();
    renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  // --- Drag to rotate ---
  let dragging = false, lastX = 0, lastY = 0, idle = 0.0035;
  let velY = 0, velX = 0, scrollY = 0, useScroll = false;

  function down(e) { dragging = true; useScroll = false; const p = point(e); lastX = p.x; lastY = p.y; }
  function move(e) {
    if (!dragging) return;
    const p = point(e);
    velY = (p.x - lastX) * 0.01;
    velX = (p.y - lastY) * 0.01;
    ball.rotation.y += velY;
    ball.rotation.x = Math.max(-1.2, Math.min(1.2, ball.rotation.x + velX));
    lastX = p.x; lastY = p.y;
  }
  function up() { dragging = false; }
  function point(e) { const t = e.touches ? e.touches[0] : e; return { x: t.clientX, y: t.clientY }; }
  mount.addEventListener("mousedown", down);
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
  mount.addEventListener("touchstart", down, { passive: true });
  window.addEventListener("touchmove", move, { passive: true });
  window.addEventListener("touchend", up);

  window.PUMPSBaseball = { setProgress(p) { useScroll = true; scrollY = p * Math.PI * 6; } };

  function loop() {
    requestAnimationFrame(loop);
    if (dragging) {
      // user controls
    } else if (useScroll) {
      ball.rotation.y += (scrollY - ball.rotation.y) * 0.12;
    } else {
      if (Math.abs(velY) > 0.0005) { ball.rotation.y += velY; velY *= 0.94; }
      else ball.rotation.y += idle;
      if (Math.abs(velX) > 0.0005) { ball.rotation.x += velX; velX *= 0.94; }
    }
    renderer.render(scene, cam);
  }
  loop();
})();
