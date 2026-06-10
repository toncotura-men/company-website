/* リアル3D地球 — Three.js
   NASA Blue Marble 4Kテクスチャ＋昼夜シェーダー＋雲レイヤー＋大気グロー。
   スクロールで宇宙から広島(34.39N,132.46E)へ接近するシネマティックズーム。
   window.PUMPSEarth.setProgress(p) を公開。 */
(function () {
  if (!window.THREE) { console.warn("[earth] THREE not loaded"); return; }
  const mount = document.getElementById("earth-canvas");
  if (!mount) return;
  const sizeOf = () => ({ w: mount.clientWidth || 360, h: mount.clientHeight || 360 });

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(36, 1, 0.05, 100);
  const CAM_FAR = 3.5, CAM_NEAR = 1.30;
  cam.position.set(0, 0, CAM_FAR);

  const renderer = new THREE.WebGLRenderer({ canvas: mount, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  /* ---- starfield ---- */
  const starGeo = new THREE.BufferGeometry();
  const SN = 1800, sp = new Float32Array(SN * 3);
  for (let i = 0; i < SN; i++) {
    const r = 9 + Math.random() * 6, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    sp[i * 3] = r * Math.sin(ph) * Math.cos(th); sp[i * 3 + 1] = r * Math.cos(ph); sp[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcfe0ff, size: 0.045, sizeAttenuation: true, transparent: true, opacity: 0.9 }));
  scene.add(stars);

  /* ---- textures (NASA Blue Marble day / city lights night / ocean specular / clouds)
         day map: 8K (8192x4096) when the GPU allows it, 4K fallback ---- */
  const loader = new THREE.TextureLoader();
  const maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 8;
  const maxTexSize = renderer.capabilities.maxTextureSize || 4096;
  const tex = (p) => { const t = loader.load(p); t.anisotropy = maxAniso; return t; };
  const dayTex = tex(maxTexSize >= 8192 ? "assets/img/earth-day-8k.jpg" : "assets/img/earth-day.jpg");
  const nightTex = tex("assets/img/earth-night.jpg");
  const specTex = tex("assets/img/earth-spec.jpg");
  const cloudTex = tex("assets/img/earth-clouds.jpg");

  const SUN_DIR = new THREE.Vector3(-1.1, 0.55, 3.6).normalize();

  /* ---- Earth: custom day/night shader with ocean specular & limb scattering ---- */
  const earthMat = new THREE.ShaderMaterial({
    uniforms: {
      dayMap: { value: dayTex },
      nightMap: { value: nightTex },
      specMap: { value: specTex },
      sunDir: { value: SUN_DIR },
    },
    vertexShader: `
      varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform sampler2D dayMap; uniform sampler2D nightMap; uniform sampler2D specMap;
      uniform vec3 sunDir;
      varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorldPos;
      void main() {
        vec3 n = normalize(vNormal);
        float ndl = dot(n, sunDir);
        float dayAmt = smoothstep(-0.08, 0.22, ndl);
        vec3 day = texture2D(dayMap, vUv).rgb;
        vec3 night = texture2D(nightMap, vUv).rgb;
        float ocean = texture2D(specMap, vUv).r;
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        vec3 halfDir = normalize(sunDir + viewDir);
        float spec = pow(max(dot(n, halfDir), 0.0), 36.0) * ocean * dayAmt;
        vec3 color = day * (0.10 + 1.15 * dayAmt);
        color += vec3(0.40, 0.50, 0.58) * spec;                       // sun glint on oceans
        color += night * vec3(1.0, 0.82, 0.55) * 1.5 * pow(1.0 - dayAmt, 1.5); // city lights
        gl_FragColor = vec4(color, 1.0);
      }`,
  });
  const globe = new THREE.Group(); scene.add(globe);
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(1, 160, 160), earthMat));

  /* ---- cloud layer (drifts independently, fades on approach) ---- */
  const cloudMat = new THREE.MeshBasicMaterial({
    map: cloudTex, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.55, depthWrite: false,
  });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, 96, 96), cloudMat);
  globe.add(clouds);

  /* ---- Hiroshima marker ---- */
  function dirFromLatLon(lat, lon) {
    const u = (lon + 180) / 360, v = (90 - lat) / 180, theta = u * 2 * Math.PI, phi = v * Math.PI;
    return new THREE.Vector3(-Math.cos(theta) * Math.sin(phi), Math.cos(phi), Math.sin(theta) * Math.sin(phi)).normalize();
  }
  const HIRO = dirFromLatLon(34.39, 132.46);
  const marker = new THREE.Group();
  marker.position.copy(HIRO.clone().multiplyScalar(1.012));
  marker.lookAt(HIRO.clone().multiplyScalar(2));
  marker.add(new THREE.Mesh(new THREE.SphereGeometry(0.016, 16, 16), new THREE.MeshBasicMaterial({ color: 0xff4d4d })));
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.024, 0.034, 32), new THREE.MeshBasicMaterial({ color: 0xff5a5a, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
  marker.add(ring); globe.add(marker);

  /* start framed like the reference photo: Japan / western Pacific facing the camera */
  const startQuat = new THREE.Quaternion()
    .setFromUnitVectors(dirFromLatLon(12, 133), new THREE.Vector3(0, 0, 1))
    .premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.08, 0, 0)));
  /* end pose: Hiroshima centered AND north pointing up on screen */
  const targetQuat = (() => {
    const north = new THREE.Vector3(0, 1, 0);
    const t = north.clone().sub(HIRO.clone().multiplyScalar(north.dot(HIRO))).normalize();
    const b = new THREE.Vector3().crossVectors(t, HIRO);
    return new THREE.Quaternion()
      .setFromRotationMatrix(new THREE.Matrix4().makeBasis(b, t, HIRO))
      .invert();
  })();

  let fitMult = 1; // portrait canvases pull the camera back so the full globe stays in frame
  function resize() {
    const { w, h } = sizeOf();
    renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
    fitMult = Math.min(2.2, Math.max(1, h / w));
  }
  window.addEventListener("resize", resize); resize();

  /* ---- cursor / touch drag spins the globe (with flick inertia) ---- */
  let dragging = false, lastX = 0, lastY = 0, velYaw = 0, userYaw = 0, userPitch = 0;
  mount.style.touchAction = "pan-y"; // vertical swipes keep scrolling the page
  mount.addEventListener("pointerdown", (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY; velYaw = 0;
    if (mount.setPointerCapture) mount.setPointerCapture(e.pointerId);
  });
  mount.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    velYaw = dx * 0.005;
    userYaw += velYaw;
    userPitch = Math.max(-0.7, Math.min(0.7, userPitch + dy * 0.003));
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) =>
    mount.addEventListener(ev, () => { dragging = false; })
  );

  let progress = 0, controlled = false, idleY = 0;
  const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
  const phase = (p, a, b) => Math.max(0, Math.min(1, (p - a) / (b - a)));
  window.PUMPSEarth = {
    setProgress(p) {
      controlled = true;
      progress = Math.max(0, Math.min(1, p));
    },
  };

  const yQuat = new THREE.Quaternion(), fromQuat = new THREE.Quaternion(), userQuat = new THREE.Quaternion();
  function loop() {
    requestAnimationFrame(loop);
    const t = performance.now();
    stars.rotation.y += 0.00035;
    clouds.rotation.y += 0.00022;

    if (!dragging) {
      idleY += controlled && progress > 0.001 ? 0.0004 : 0.0018;
      userYaw += velYaw; velYaw *= 0.94; // flick inertia
    }
    yQuat.setFromEuler(new THREE.Euler(0, idleY, 0));
    fromQuat.copy(startQuat).multiply(yQuat);

    /* phase 1: rotate to face Hiroshima / phase 2: dive toward the city.
       Manual spin (cursor drag) blends out as the dive takes over. */
    const rotE = easeInOut(phase(progress, 0.0, 0.62));
    const zoomE = easeInOut(phase(progress, 0.28, 1.0));
    userQuat.setFromEuler(new THREE.Euler(userPitch * (1 - rotE), userYaw * (1 - rotE), 0));
    globe.quaternion.copy(userQuat).multiply(fromQuat.slerp(targetQuat, rotE));
    const farEff = CAM_FAR * fitMult;
    cam.position.z = farEff + (CAM_NEAR - farEff) * zoomE;
    cam.fov = 36 - 12 * zoomE; cam.updateProjectionMatrix();

    cloudMat.opacity = 0.3 * (1 - 0.85 * zoomE);          // break through the clouds
    marker.scale.setScalar(1 - 0.78 * zoomE);             // keep pin proportional at close range

    const s = 1 + 0.3 * Math.sin(t * 0.004);
    ring.scale.setScalar(s); ring.material.opacity = (0.9 - 1.4 * (s - 1)) * (0.35 + 0.65 * rotE);
    renderer.render(scene, cam);
  }
  loop();
})();
