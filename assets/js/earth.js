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

  // ---- real Earth texture (Natural Earth equirectangular) ----
  const earthTex = new THREE.TextureLoader().load("assets/img/earth-texture.jpg");
  if ("colorSpace" in earthTex) earthTex.colorSpace = THREE.SRGBColorSpace;
  earthTex.anisotropy = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 8;

  const globe = new THREE.Group(); scene.add(globe);
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(1, 128, 128),
    new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.88, metalness: 0.05, emissive: 0x0a1a30, emissiveIntensity: 0.25 })
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
