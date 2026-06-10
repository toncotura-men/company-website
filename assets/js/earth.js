/* 3D地球儀 — Three.js（テック系ワイヤーフレーム + ドットの大陸表現） */
(function () {
  if (!window.THREE) { console.warn("[earth] THREE not loaded"); return; }
  const mount = document.getElementById("earth-canvas");
  if (!mount) return;

  const sizeOf = () => ({ w: mount.clientWidth || 360, h: mount.clientHeight || 360 });

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  cam.position.set(0, 0, 3.2);
  const renderer = new THREE.WebGLRenderer({ canvas: mount, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const globe = new THREE.Group();
  scene.add(globe);

  // inner dark sphere
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.985, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x081523 })
  ));

  // lat/long wireframe
  globe.add(new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.SphereGeometry(1, 28, 20)),
    new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.22 })
  ));

  // surface points (dotted "continents")
  const COUNT = 900;
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    // fibonacci sphere for even spread
    const t = i / COUNT;
    const phi = Math.acos(1 - 2 * t);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const r = 1.01;
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi);
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  globe.add(new THREE.Points(pg, new THREE.PointsMaterial({
    color: 0x7dd3fc, size: 0.022, transparent: true, opacity: 0.85
  })));

  // outer glow ring
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(1.06, 40, 40),
    new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.05, side: THREE.BackSide })
  ));

  globe.rotation.x = 0.4;

  function resize() {
    const { w, h } = sizeOf();
    renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  function loop() {
    requestAnimationFrame(loop);
    globe.rotation.y += 0.0024;
    renderer.render(scene, cam);
  }
  loop();
})();
