/* 硬式球の3Dモデル — Three.js
   - 本物の野球縫合曲線（自己交差しない単一シーム lat = A·cos2θ）をUVに展開
   - レザー質感の段階シェーディング＋赤の二重ステッチ＋バンプ(凹凸)
   - カーソル/タッチのドラッグで360度回転、スクロール連動 setProgress() を公開 */
(function () {
  if (!window.THREE) { console.warn("[baseball] THREE not loaded"); return; }
  const mount = document.getElementById("baseball-canvas");
  if (!mount) return;

  const sizeOf = () => ({ w: mount.clientWidth || 400, h: mount.clientHeight || 400 });

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  cam.position.set(0, 0, 3.25);

  const renderer = new THREE.WebGLRenderer({ canvas: mount, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.15); key.position.set(4, 5, 6); scene.add(key);
  const fill = new THREE.DirectionalLight(0xbcd4ff, 0.4); fill.position.set(-5, 1, 3); scene.add(fill);
  const rim = new THREE.DirectionalLight(0x38bdf8, 0.5); rim.position.set(-3, -2, -5); scene.add(rim);

  const TW = 2048, TH = 1024, A = 1.0, STEPS = 1400;
  const seamX = (t) => (t / (2 * Math.PI)) * TW;
  const seamYv = (t) => (0.5 - (A * Math.cos(2 * t)) / Math.PI) * TH;

  function strokeSeam(ctx, color, width) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i <= STEPS; i++) {
      const t = (2 * Math.PI * i) / STEPS, x = seamX(t), y = seamYv(t);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }

  function drawStitches(ctx, color, w, scale) {
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round";
    const N = 150;
    for (let i = 0; i <= N; i++) {
      const t = (2 * Math.PI * i) / N;
      const X = seamX(t), Y = seamYv(t);
      // tangent in pixel space
      const dX = TW / (2 * Math.PI);
      const dY = (2 * A * Math.sin(2 * t)) / Math.PI * TH;
      const ln = Math.hypot(dX, dY) || 1;
      const tx = dX / ln, ty = dY / ln, nx = -ty, ny = tx;
      const gap = 19 * scale, L = 20 * scale;
      for (const s of [1, -1]) {
        const cx = X + nx * gap * s, cy = Y + ny * gap * s;
        // angled stitch (slants toward the seam)
        let ax = tx * 0.5 + nx * 0.5 * s, ay = ty * 0.5 + ny * 0.5 * s;
        const an = Math.hypot(ax, ay) || 1; ax /= an; ay /= an;
        ctx.beginPath();
        ctx.moveTo(cx - ax * L / 2, cy - ay * L / 2);
        ctx.lineTo(cx + ax * L / 2, cy + ay * L / 2);
        ctx.stroke();
      }
    }
  }

  function makeColorMap() {
    const c = document.createElement("canvas"); c.width = TW; c.height = TH;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, TH);
    g.addColorStop(0, "#efe8d9"); g.addColorStop(0.5, "#f6f1e6"); g.addColorStop(1, "#e6ddca");
    x.fillStyle = g; x.fillRect(0, 0, TW, TH);
    for (let i = 0; i < 26000; i++) {
      const a = Math.random() * 0.05;
      x.fillStyle = (Math.random() < 0.5 ? "rgba(120,108,86," : "rgba(255,255,255,") + a + ")";
      x.fillRect(Math.random() * TW, Math.random() * TH, 2, 2);
    }
    strokeSeam(x, "rgba(150,120,90,0.55)", 22);   // leather groove shadow
    drawStitches(x, "#b01a1e", 7, 1);             // red double stitches
    drawStitches(x, "#8f1418", 3, 1);             // darker accent
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 8;
    if ("colorSpace" in t) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function makeBumpMap() {
    const c = document.createElement("canvas"); c.width = TW; c.height = TH;
    const x = c.getContext("2d");
    x.fillStyle = "#808080"; x.fillRect(0, 0, TW, TH);
    for (let i = 0; i < 16000; i++) {
      const v = 128 + (Math.random() - 0.5) * 24;
      x.fillStyle = `rgb(${v | 0},${v | 0},${v | 0})`;
      x.fillRect(Math.random() * TW, Math.random() * TH, 2, 2);
    }
    strokeSeam(x, "#4f4f4f", 9);        // recessed groove
    drawStitches(x, "#f3f3f3", 7, 1);   // raised stitches
    return new THREE.CanvasTexture(c);
  }

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(1, 180, 180),
    new THREE.MeshStandardMaterial({
      map: makeColorMap(), bumpMap: makeBumpMap(), bumpScale: 0.014,
      roughness: 0.5, metalness: 0.0,
    })
  );
  ball.rotation.x = 0.4; ball.rotation.z = 0.15;
  scene.add(ball);

  function resize() { const { w, h } = sizeOf(); renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  window.addEventListener("resize", resize); resize();

  let dragging = false, lastX = 0, lastY = 0, idle = 0.0034;
  let velY = 0, velX = 0, scrollY = 0, useScroll = false;
  const point = (e) => { const t = e.touches ? e.touches[0] : e; return { x: t.clientX, y: t.clientY }; };
  function down(e) { dragging = true; useScroll = false; const p = point(e); lastX = p.x; lastY = p.y; }
  function move(e) {
    if (!dragging) return; const p = point(e);
    velY = (p.x - lastX) * 0.01; velX = (p.y - lastY) * 0.01;
    ball.rotation.y += velY; ball.rotation.x = Math.max(-1.3, Math.min(1.3, ball.rotation.x + velX));
    lastX = p.x; lastY = p.y;
  }
  function up() { dragging = false; }
  mount.addEventListener("mousedown", down);
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
  mount.addEventListener("touchstart", down, { passive: true });
  window.addEventListener("touchmove", move, { passive: true });
  window.addEventListener("touchend", up);

  window.PUMPSBaseball = { setProgress(p) { useScroll = true; scrollY = p * Math.PI * 6; } };

  function loop() {
    requestAnimationFrame(loop);
    if (dragging) { /* user */ }
    else if (useScroll) { ball.rotation.y += (scrollY - ball.rotation.y) * 0.12; }
    else {
      if (Math.abs(velY) > 0.0005) { ball.rotation.y += velY; velY *= 0.94; } else ball.rotation.y += idle;
      if (Math.abs(velX) > 0.0005) { ball.rotation.x += velX; velX *= 0.94; }
    }
    renderer.render(scene, cam);
  }
  loop();
})();
