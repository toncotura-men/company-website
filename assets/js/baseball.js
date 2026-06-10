/* 硬式球の3Dモデル — Three.js
   - カーソル/タッチのドラッグで360度回転
   - スクロール連動回転用に window.PUMPSBaseball.setProgress() を公開 */
(function () {
  if (!window.THREE) { console.warn("[baseball] THREE not loaded"); return; }
  const mount = document.getElementById("baseball-canvas");
  if (!mount) return;

  const sizeOf = () => ({ w: mount.clientWidth || 400, h: mount.clientHeight || 400 });

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  cam.position.set(0, 0, 3.4);

  const renderer = new THREE.WebGLRenderer({ canvas: mount, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x38bdf8, 0.6); rim.position.set(-4, -2, -3); scene.add(rim);

  // --- Procedural baseball texture (off-white leather + two red seams) ---
  function makeTexture() {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 512;
    const x = c.getContext("2d");
    x.fillStyle = "#f3efe6"; x.fillRect(0, 0, c.width, c.height);
    // subtle leather speckle
    for (let i = 0; i < 1400; i++) {
      x.fillStyle = "rgba(150,140,120," + (Math.random() * 0.05) + ")";
      x.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 2);
    }
    drawSeam(x, c.width, c.height, 0);
    drawSeam(x, c.width, c.height, Math.PI);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }
  function drawSeam(ctx, W, H, phase) {
    const N = 220, amp = H * 0.30, mid = H * 0.5;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      pts.push({ x: t * W, y: mid + amp * Math.sin(t * Math.PI * 2 + phase) });
    }
    // base curve
    ctx.strokeStyle = "rgba(193,18,31,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.stroke();
    // stitches (V shaped ticks)
    ctx.strokeStyle = "#c1121f";
    ctx.lineWidth = 3;
    for (let i = 4; i < N; i += 7) {
      const p = pts[i], q = pts[i + 1] || pts[i];
      const dx = q.x - p.x, dy = q.y - p.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len; // normal
      const s = 9;
      ctx.beginPath();
      ctx.moveTo(p.x - dx * 0.4, p.y - dy * 0.4);
      ctx.lineTo(p.x + nx * s, p.y + ny * s);
      ctx.moveTo(p.x - dx * 0.4, p.y - dy * 0.4);
      ctx.lineTo(p.x - nx * s, p.y - ny * s);
      ctx.stroke();
    }
  }

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(1, 96, 96),
    new THREE.MeshStandardMaterial({ map: makeTexture(), roughness: 0.62, metalness: 0.02 })
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

  function down(e) {
    dragging = true; useScroll = false;
    const p = point(e); lastX = p.x; lastY = p.y;
  }
  function move(e) {
    if (!dragging) return;
    const p = point(e);
    velY = (p.x - lastX) * 0.01;
    velX = (p.y - lastY) * 0.01;
    ball.rotation.y += velY;
    ball.rotation.x += velX;
    lastX = p.x; lastY = p.y;
  }
  function up() { dragging = false; }
  function point(e) {
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX, y: t.clientY };
  }
  mount.addEventListener("mousedown", down);
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
  mount.addEventListener("touchstart", down, { passive: true });
  window.addEventListener("touchmove", move, { passive: true });
  window.addEventListener("touchend", up);

  // Scroll-driven rotation (set by ScrollTrigger in main.js)
  window.PUMPSBaseball = {
    setProgress(p) { useScroll = true; scrollY = p * Math.PI * 6; }
  };

  function loop() {
    requestAnimationFrame(loop);
    if (dragging) {
      // user controls
    } else if (useScroll) {
      ball.rotation.y += (scrollY - ball.rotation.y) * 0.12;
    } else {
      // inertia then gentle idle spin
      if (Math.abs(velY) > 0.0005) { ball.rotation.y += velY; velY *= 0.94; }
      else ball.rotation.y += idle;
      if (Math.abs(velX) > 0.0005) { ball.rotation.x += velX; velX *= 0.94; }
    }
    renderer.render(scene, cam);
  }
  loop();
})();
