/* 3D地球儀 — Three.js（宇宙に浮かぶ青く輝く地球：星空＋大気グロー）
   スクロールで広島(34.39N,132.46E)へ回転＆ズーム。window.PUMPSEarth.setProgress(p) を公開。 */
(function () {
  if (!window.THREE) { console.warn("[earth] THREE not loaded"); return; }
  const mount = document.getElementById("earth-canvas");
  if (!mount) return;
  const label = document.getElementById("earth-label");
  const sizeOf = () => ({ w: mount.clientWidth || 360, h: mount.clientHeight || 360 });

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const CAM_FAR = 3.3, CAM_NEAR = 1.95;
  cam.position.set(0, 0, CAM_FAR);

  const renderer = new THREE.WebGLRenderer({ canvas: mount, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene.add(new THREE.AmbientLight(0x90b4e0, 0.55));
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.15); sun.position.set(-3, 1.5, 4); scene.add(sun);

  // ---- starfield (parallax background) ----
  const starGeo = new THREE.BufferGeometry();
  const SN = 1600, sp = new Float32Array(SN * 3);
  for (let i = 0; i < SN; i++) {
    const r = 9 + Math.random() * 6, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    sp[i * 3] = r * Math.sin(ph) * Math.cos(th); sp[i * 3 + 1] = r * Math.cos(ph); sp[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xbfd8ff, size: 0.05, sizeAttenuation: true, transparent: true, opacity: 0.9 }));
  scene.add(stars);

  // ---- continents [lon,lat] ----
  const CONT = [
    [[-165,62],[-150,70],[-95,72],[-82,63],[-60,60],[-52,48],[-66,44],[-80,42],[-75,35],[-81,25],[-97,18],[-105,23],[-115,30],[-124,40],[-128,50],[-150,58]],
    [[-80,8],[-62,10],[-50,0],[-35,-8],[-40,-23],[-58,-35],[-70,-52],[-73,-40],[-72,-20],[-78,-5]],
    [[-10,36],[0,44],[3,52],[-5,58],[5,62],[28,70],[40,66],[30,55],[40,46],[28,40],[10,38]],
    [[-16,16],[10,34],[24,32],[34,30],[44,12],[52,12],[40,-5],[38,-18],[26,-34],[18,-34],[12,-16],[8,4],[-8,6]],
    [[40,66],[60,72],[100,76],[140,72],[160,68],[178,66],[180,60],[140,52],[135,46],[142,40],[122,40],[120,22],[105,10],[95,16],[88,22],[70,26],[58,40],[48,48],[44,58]],
    [[68,24],[78,30],[88,24],[92,22],[80,8],[76,16]],
    [[114,-22],[130,-12],[142,-12],[150,-24],[146,-38],[130,-32],[116,-34]],
    [[131,31],[134,34],[138,37],[141,40],[139,41],[136,36],[133,33]],
  ];
  const TW = 2048, TH = 1024;
  const lon2x = (lon) => (lon + 180) / 360 * TW;
  const lat2y = (lat) => (90 - lat) / 180 * TH;

  function makeEarthTexture() {
    const c = document.createElement("canvas"); c.width = TW; c.height = TH;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, TH);
    g.addColorStop(0, "#0a2747"); g.addColorStop(0.5, "#0e3e6e"); g.addColorStop(1, "#081f3c");
    x.fillStyle = g; x.fillRect(0, 0, TW, TH);
    // subtle ocean ripples
    for (let i = 0; i < 9000; i++) { x.fillStyle = "rgba(120,180,240," + (Math.random() * 0.04) + ")"; x.fillRect(Math.random() * TW, Math.random() * TH, 2, 2); }
    CONT.forEach((poly) => {
      x.beginPath();
      poly.forEach((p, i) => { const px = lon2x(p[0]), py = lat2y(p[1]); i ? x.lineTo(px, py) : x.moveTo(px, py); });
      x.closePath();
      const lg = x.createLinearGradient(0, 0, 0, TH);
      lg.addColorStop(0, "#2f7d4a"); lg.addColorStop(0.6, "#1f6b39"); lg.addColorStop(1, "#155233");
      x.fillStyle = lg; x.fill();
      x.shadowColor = "rgba(120,235,200,0.8)"; x.shadowBlur = 12;
      x.strokeStyle = "rgba(150,240,210,0.85)"; x.lineWidth = 2; x.stroke(); x.shadowBlur = 0;
    });
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 8;
    if ("colorSpace" in t) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  const globe = new THREE.Group(); scene.add(globe);
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(1, 128, 128),
    new THREE.MeshStandardMaterial({ map: makeEarthTexture(), roughness: 0.82, metalness: 0.08, emissive: 0x0a2036, emissiveIntensity: 0.35 })
  ));

  // ---- atmosphere glow (fresnel rim) ----
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(1.16, 64, 64),
    new THREE.ShaderMaterial({
      uniforms: { glowColor: { value: new THREE.Color(0x37a6ff) } },
      vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "varying vec3 vN; uniform vec3 glowColor; void main(){ float i = pow(1.0 - abs(vN.z), 3.0); gl_FragColor = vec4(glowColor, i); }",
      blending: THREE.AdditiveBlending, transparent: true, side: THREE.BackSide, depthWrite: false,
    })
  );
  scene.add(atmo);
  // inner haze
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.04, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x2aa9ff, transparent: true, opacity: 0.07, side: THREE.BackSide })));

  // ---- Hiroshima marker ----
  function dirFromLatLon(lat, lon) {
    const u = (lon + 180) / 360, v = (90 - lat) / 180, theta = u * 2 * Math.PI, phi = v * Math.PI;
    return new THREE.Vector3(-Math.cos(theta) * Math.sin(phi), Math.cos(phi), Math.sin(theta) * Math.sin(phi)).normalize();
  }
  const HIRO = dirFromLatLon(34.39, 132.46);
  const marker = new THREE.Group();
  marker.position.copy(HIRO.clone().multiplyScalar(1.012));
  marker.lookAt(HIRO.clone().multiplyScalar(2));
  marker.add(new THREE.Mesh(new THREE.SphereGeometry(0.02, 16, 16), new THREE.MeshBasicMaterial({ color: 0xff4d4d })));
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.028, 0.04, 32), new THREE.MeshBasicMaterial({ color: 0xff5a5a, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  marker.add(ring); globe.add(marker);

  const startQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.35, 0.6, 0));
  const targetQuat = new THREE.Quaternion().setFromUnitVectors(HIRO, new THREE.Vector3(0, 0, 1));
  globe.quaternion.copy(startQuat);

  function resize() { const { w, h } = sizeOf(); renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  window.addEventListener("resize", resize); resize();

  let progress = 0, controlled = false, idleY = 0;
  const easeInOut = (p) => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  window.PUMPSEarth = {
    setProgress(p) {
      controlled = true; progress = Math.max(0, Math.min(1, p));
      if (label) label.style.opacity = String(Math.max(0, (progress - 0.45) / 0.4));
    }
  };

  function loop() {
    requestAnimationFrame(loop);
    stars.rotation.y += 0.0004;
    if (!controlled || progress < 0.001) {
      idleY += 0.0022;
      globe.quaternion.copy(startQuat).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, idleY, 0)));
      cam.position.z = CAM_FAR;
      if (label && !controlled) label.style.opacity = "0";
    } else {
      const e = easeInOut(progress);
      globe.quaternion.copy(startQuat).slerp(targetQuat, e);
      cam.position.z = CAM_FAR + (CAM_NEAR - CAM_FAR) * e;
    }
    const s = 1 + 0.25 * Math.sin(performance.now() * 0.004);
    ring.scale.setScalar(s); ring.material.opacity = 0.9 - 1.6 * (s - 1);
    renderer.render(scene, cam);
  }
  loop();
})();
