// render.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { clamp } from "./ui.js";

function makeShellTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");

  const g = ctx.createRadialGradient(128, 128, 60, 128, 128, 128);
  g.addColorStop(0.0, "rgba(255,255,255,0.0)");
  g.addColorStop(0.55, "rgba(255,255,255,0.10)");
  g.addColorStop(0.72, "rgba(255,255,255,0.45)");
  g.addColorStop(0.78, "rgba(255,255,255,0.55)");
  g.addColorStop(1.0, "rgba(255,255,255,0.0)");

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeHaloTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0.0, "rgba(255,255,255,1.0)");
  g.addColorStop(0.2, "rgba(255,255,255,0.55)");
  g.addColorStop(0.6, "rgba(255,255,255,0.12)");
  g.addColorStop(1.0, "rgba(255,255,255,0.0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function addDustDisk(scene, starGroup) {
  const geom = new THREE.RingGeometry(1.2, 3.2, 128);

  const mat = new THREE.MeshBasicMaterial({
    color: 0xd9c7a6,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const disk = new THREE.Mesh(geom, mat);
  disk.position.copy(starGroup.position);
  disk.rotation.x = Math.PI / 2;
  scene.add(disk);
  return disk;
}

function makeAccretionDiskMaterial() {
  // Shader for a bright ring with falloff and a little swirl variation.
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uInner: { value: 1.35 },  // ring inner radius in local disk units
      uOuter: { value: 3.2 },   // ring outer radius in local disk units
      uStrength: { value: 1.0 },
      uTint: { value: new THREE.Color(0x9ec5ff) }, // bluish-white
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;

      uniform float uTime;
      uniform float uInner;
      uniform float uOuter;
      uniform float uStrength;
      uniform vec3  uTint;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }

      void main() {
        // uv in [0,1] -> map to [-1,1]
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);

        // ring mask
        float inner = smoothstep(uInner, uInner + 0.06, r);
        float outer = 1.0 - smoothstep(uOuter - 0.10, uOuter, r);
        float ring = inner * outer;

        // swirl brightness (simple angular modulation)
        float ang = atan(p.y, p.x);
        float swirl = 0.55 + 0.45 * sin(ang * 10.0 + uTime * 1.8);

        // add a bit of grain
        float g = hash(p * 30.0 + uTime * 0.2);
        float grain = 0.85 + 0.30 * (g - 0.5);

        float intensity = ring * swirl * grain;

        // stronger near inner edge
        float innerBoost = 1.0 / (1.0 + 2.5 * max(r - uInner, 0.0));
        intensity *= innerBoost;

        vec3 col = uTint * intensity * uStrength;

        // soft clip
        col = col / (vec3(1.0) + col);

        float alpha = clamp(intensity * 0.95, 0.0, 0.95);
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
}

function makePhotonRingTexture() {
  // a thin bright ring sprite texture
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");

  ctx.clearRect(0, 0, 256, 256);

  const g = ctx.createRadialGradient(128, 128, 50, 128, 128, 128);
  g.addColorStop(0.00, "rgba(255,255,255,0.0)");
  g.addColorStop(0.55, "rgba(255,255,255,0.0)");
  g.addColorStop(0.68, "rgba(255,255,255,0.25)");
  g.addColorStop(0.74, "rgba(255,255,255,0.65)");
  g.addColorStop(0.80, "rgba(255,255,255,0.20)");
  g.addColorStop(1.00, "rgba(255,255,255,0.0)");

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createBlackHoleRig(scene, starGroup) {
  // Accretion disk mesh
  const geom = new THREE.RingGeometry(1.2, 3.4, 196, 2);
  const mat = makeAccretionDiskMaterial();
  const disk = new THREE.Mesh(geom, mat);
  disk.visible = false;

  // Tilt disk so it reads in 3D
  disk.rotation.x = Math.PI / 2.0;
  disk.rotation.z = 0.35;
  scene.add(disk);

  // Photon ring sprite (optional but helps readability)
  const ring = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makePhotonRingTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      opacity: 0.0,
      color: new THREE.Color(0xffffff),
    })
  );
  ring.visible = false;
  ring.renderOrder = 1000;
  scene.add(ring);

  // store a little state
  const rig = {
    disk,
    ring,
    // simple spin param
    omega: 0.8,
    setVisible(v) {
      disk.visible = v;
      ring.visible = v;
      if (!v) {
        if (disk.material?.uniforms?.uStrength) disk.material.uniforms.uStrength.value = 0.0;
        if (ring.material) ring.material.opacity = 0.0;
      }
    },
    update(timeSec, camDir, Rv) {
      // keep centered on the BH
      disk.position.copy(starGroup.position);
      ring.position.copy(starGroup.position);

      // scale with BH visual radius
      const diskScale = Math.max(1.0, Rv * 1.2);
      disk.scale.setScalar(diskScale);
      ring.scale.setScalar(Rv * 8.0);

      // rotate disk continuously
      disk.rotation.y += this.omega * 0.016; // approx frame step; we also set uTime anyway

      // make ring face camera
      // (Sprites already face camera by default, but keep it stable)
      ring.position.addScaledVector(camDir, -0.12 * Rv);

      // animate disk shader time
      if (disk.material?.uniforms?.uTime) disk.material.uniforms.uTime.value = timeSec;
    },
  };

  return rig;
}

export function createStarScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f18);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  camera.position.set(0, 1.5, 7);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  container.appendChild(renderer.domElement);

  function resize() {
    const r = container.getBoundingClientRect();
    const w = Math.max(1, Math.floor(r.width));
    const h = Math.max(1, Math.floor(r.height));
    renderer.setSize(w, h, true);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  //const grid = new THREE.GridHelper(18, 18);
  //grid.position.y = -1.6;
  //scene.add(grid);

  scene.add(new THREE.AmbientLight(0xffffff, 0.05));
  const key = new THREE.DirectionalLight(0xffffff, 0.7);
  key.position.set(3, 3, 3);
  scene.add(key);

  const starGroup = new THREE.Group();
  const blackHole = createBlackHoleRig(scene, starGroup);
  starGroup.position.set(0, 0.3, 0);
  scene.add(starGroup);

  const starMat = makeStarMaterial();


  const star = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 48), starMat);
  starGroup.add(star);

  const starLight = new THREE.PointLight(0xffffff, 2.0, 35, 2.0);
  starLight.position.copy(starGroup.position);
  scene.add(starLight);

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeHaloTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    })
  );
  halo.position.copy(starGroup.position);
  halo.renderOrder = 999;
  scene.add(halo);

  const disk = addDustDisk(scene, starGroup);

   const shell = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: makeShellTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      opacity: 0.0,
      color: new THREE.Color(0xffffff),
    })
  );
  shell.position.copy(starGroup.position);
  shell.renderOrder = 998;
  scene.add(shell);

  function aimCamera() {
    camera.lookAt(starGroup.position);
  }
  aimCamera();

  return { scene, camera, renderer, starGroup, starMat, starLight, halo, shell, disk, blackHole, resize, aimCamera };
}

export function colorFromTempK(T) {
  const t = clamp(T, 2500, 40000);
  const x = (Math.log10(t) - Math.log10(2500)) / (Math.log10(40000) - Math.log10(2500));

  const cool = new THREE.Color(0xff6a3a);
  const mid = new THREE.Color(0xffffff);
  const hot = new THREE.Color(0x4d86ff);

  if (x < 0.55) return cool.clone().lerp(mid, x / 0.55);
  return mid.clone().lerp(hot, (x - 0.55) / (1 - 0.55));

  
}

export function applyStarVisuals(render, state) {
  const { starGroup, starMat, starLight, halo, shell, disk, aimCamera } = render;
  const { L, T, R, M = 1, f01 = 0, fColor, stage = "ms" } = state;

  const Rv = R; // or visualRadius(R, stage) if you implemented that
  starGroup.scale.setScalar(Rv);
  const fc = Number.isFinite(fColor) ? fColor : f01;

  starGroup.scale.setScalar(R);

  // BRIGHTNESS 
  const glow = clamp(Math.log10(L + 1) * 1.35 + 1.55, 1.4, 9.5);
  // --- COLOR (mass-aware: big stars start bluer then drift toward white) ---
  const big = clamp(Math.log10(Math.max(0.1, M)), 0, 2);
  const startBoost = 1.0 + 0.35 * big;
  const timeCool = 1.0 + 0.55 * big * fc;   // <-- use fc
  const T_for_color = (T * startBoost) / timeCool;
  const c = colorFromTempK(T_for_color);

  // --- Black hole rendering ---
  if (stage === "bh") {
    // make the sphere fully dark
    if (starMat?.uniforms?.uColor) starMat.uniforms.uColor.value.setRGB(0.0, 0.0, 0.0);
    if (starMat?.uniforms?.uGlow) starMat.uniforms.uGlow.value = 0.01;
    if (starMat?.uniforms?.uGranuleStrength) starMat.uniforms.uGranuleStrength.value = 0.0;
    if (starMat?.uniforms?.uSpotStrength) starMat.uniforms.uSpotStrength.value = 0.0;

    // kill light + halo + shell + proto disk
    starLight.intensity = 0.0;
    if (halo?.material) halo.material.opacity = 0.0;
    if (shell?.material) shell.material.opacity = 0.0;
    if (disk?.material) disk.material.opacity = 0.0;

    // show accretion rig
    if (render.blackHole) {
      render.blackHole.setVisible(true);
      // make it brighter for big BHs if you want
      const strength = clamp(0.65 + Math.log10(Math.max(1e-6, L + 1.0)) * 0.15, 0.55, 1.25);
      if (render.blackHole.disk?.material?.uniforms?.uStrength) {
        render.blackHole.disk.material.uniforms.uStrength.value = strength;
      }
      if (render.blackHole.ring?.material) {
        render.blackHole.ring.material.opacity = clamp(0.22 + 0.08 * strength, 0.0, 0.55);
      }
    }

    aimCamera();
    return; // IMPORTANT: don't overwrite the dark settings below
  } else {
    // hide BH rig for non-BH
    if (render.blackHole) render.blackHole.setVisible(false);
  }
  // Apply shader surface tint
  if (starMat?.uniforms?.uColor) starMat.uniforms.uColor.value.copy(c);

  // Emissive intensity (keep texture)
  const solarBoost = 1.0 + 0.55 * Math.exp(-Math.pow((M - 1.0) / 0.65, 2));
  if (starMat?.uniforms?.uGlow) starMat.uniforms.uGlow.value = glow * 1.6 * solarBoost;

  // --- Make the emitted light match the star colour ---
  starLight.color.copy(c);              // <-- THIS is the key line
  starLight.intensity = glow * 3.4;

  // --- Halo: also tint it (otherwise it looks white) ---
  if (halo?.material) {
    halo.material.color.copy(c);        // SpriteMaterial supports .color
  }
  halo.scale.setScalar(R * (4.4 + glow * 0.85));
  halo.material.opacity = clamp(0.32 + glow * 0.10, 0, 0.95);
  
  const ejecta = Number.isFinite(state.ejecta) ? state.ejecta : 0.0;
  const shellR = Number.isFinite(state.shellR) ? state.shellR : R;

  if (shell?.material) {
    shell.material.color.copy(c);
    shell.material.opacity = clamp(0.55 * ejecta, 0, 0.65);
  }

  if (shell) {
    shell.position.copy(starGroup.position);
    shell.scale.setScalar(shellR * 2.2);
  }
  // --- Dust disk 
  if (disk) {
    const shrink = Math.pow(1.0 - f01, 1.6);
    const baseOuter = 2.8;
    const outer = (0.9 + baseOuter * shrink) * Math.max(0.95, R);

    disk.scale.setScalar(outer / 3.2);
    disk.position.copy(starGroup.position);
    disk.rotation.z = 0.25;

    if (stage === "proto") {
      const fade = Math.pow(1.0 - f01, 2.0);
      disk.material.opacity = clamp(0.40 * fade, 0, 0.40);
    } else {
      disk.material.opacity = 0.0;
    }
  }

  aimCamera();
}

export function setupDragControls(domElement, starGroup) {
  let dragging = false,
    lastX = 0,
    lastY = 0;

  domElement.addEventListener("mousedown", (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  window.addEventListener("mouseup", () => (dragging = false));
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    starGroup.rotation.y += dx * 0.01;
    starGroup.rotation.x += dy * 0.01;
  });
}

export function setupZoomControls({ camera, domElement, zoomInBtn, zoomOutBtn, aimCamera }) {
  function zoomBy(delta) {
    camera.position.z = clamp(camera.position.z + delta, 0.3, 500);
    aimCamera();
  }

  domElement.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoomBy(Math.sign(e.deltaY) * 1.8);//0.8
    },
    { passive: false }
  );

  zoomInBtn?.addEventListener("click", () => zoomBy(-2.2)); //0.8
  zoomOutBtn?.addEventListener("click", () => zoomBy(+2.2));
}


export function makeStarMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0xffffff) },
      uGlow: { value: 1.8 },
      uGranuleStrength: { value: 0.8 },
      uLimb: { value: 0.65 },
      uSpotStrength: { value: 0.15 },
      uSpin: { value: 0.02 },

      // NEW: detail controls
      uDetail: { value: 1.25 }, // overall texture frequency (1.0–1.8 typical)
      uMicro: { value: 1.0 },   // micro-grain strength (0.0–1.5 typical)
    },

    vertexShader: `
      varying vec3 vNormalW;
      varying vec3 vPosW;

      void main() {
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vPosW = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,

    fragmentShader: `
      precision highp float;

      varying vec3 vNormalW;
      varying vec3 vPosW;

      uniform float uTime;
      uniform vec3  uColor;
      uniform float uGlow;
      uniform float uGranuleStrength;
      uniform float uLimb;
      uniform float uSpotStrength;
      uniform float uSpin;

      uniform float uDetail;
      uniform float uMicro;

      // Hash / noise: classic value noise
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);

        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));

        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      // More octaves = more fine detail (slightly more expensive)
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.55;
        for (int i = 0; i < 9; i++) {
          v += a * noise(p);
          p *= 2.0;
          a *= 0.55;
        }
        return v;
      }

      void main() {
        vec3 N = normalize(vNormalW);

        // Sphere UV from normal
        float u = atan(N.z, N.x) / 6.2831853 + 0.5;
        float v = asin(N.y) / 3.1415926 + 0.5;
        vec2 p = vec2(u, v);

        // Spin/drift control
        p.x += uTime * uSpin;

        float t = uTime * 0.4;
        float d = max(uDetail, 0.01);

        // Higher sampling frequencies to reduce visible blockiness when zoomed
        float s1 = fbm(p * (140.0 * d) + vec2( t * 0.8, -t * 0.6));
        float s2 = fbm(p * (260.0 * d) + vec2(-t * 0.5,  t * 0.9));
        float g  = mix(s1, s2, 0.55);

        // Softer thresholds -> less "cell tiling" look
        float cells    = smoothstep(0.48, 0.80, g);
        float interior = 1.0 - smoothstep(0.18, 0.70, g);
        float gran     = 0.60 * cells + 0.40 * (1.0 - interior);

        // Micro-grain: breaks up any remaining block patterns
        float micro = fbm(p * (900.0 * d) + vec2(t * 1.7, -t * 1.3));
        gran += (micro - 0.5) * 0.18 * uMicro;

        // Spots (large-scale) - keep separate so it reads as surface features
        float spotField = fbm(p * (10.0 * d) + vec2(t * 0.08, t * 0.05));
        float spots = smoothstep(0.72, 0.88, spotField);

        // Limb darkening
        vec3 Vdir = normalize(cameraPosition - vPosW);
        float ndv = clamp(dot(N, Vdir), 0.0, 1.0);
        float limb = pow(ndv, 1.0 - uLimb);

        // Brightness modulation
        float bright = 1.0 + uGranuleStrength * (gran - 0.5);
        bright *= (1.0 - uSpotStrength * spots);

        vec3 col = uColor * bright * uGlow;

        // Apply limb darkening once
        col *= mix(0.55, 1.0, limb);

        // Soft clip / tone-map-ish
        col = col / (vec3(1.0) + col);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

/*
Optional helper (NOT required):
Call this from applyStarVisuals if you want to tweak live.

export function setStarMaterialDetail(starMat, { detail = 1.25, micro = 1.0 } = {}) {
  if (starMat?.uniforms?.uDetail) starMat.uniforms.uDetail.value = detail;
  if (starMat?.uniforms?.uMicro)  starMat.uniforms.uMicro.value  = micro;
}
*/


