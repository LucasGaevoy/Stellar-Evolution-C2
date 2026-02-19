// render.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { clamp } from "./ui.js";

function makeHaloTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0.0, "rgba(255, 220, 140, 1.0)");
  g.addColorStop(0.2, "rgba(255, 220, 140, 0.55)");
  g.addColorStop(0.6, "rgba(255, 220, 140, 0.12)");
  g.addColorStop(1.0, "rgba(255, 220, 140, 0.0)");
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

  const grid = new THREE.GridHelper(18, 18);
  grid.position.y = -1.6;
  scene.add(grid);

  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const key = new THREE.DirectionalLight(0xffffff, 0.7);
  key.position.set(3, 3, 3);
  scene.add(key);

  const starGroup = new THREE.Group();
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

  function aimCamera() {
    camera.lookAt(starGroup.position);
  }
  aimCamera();

  return { scene, camera, renderer, starGroup, starMat, starLight, halo, disk, resize, aimCamera };
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
  const { starGroup, starMat, starLight, halo, disk, aimCamera } = render;
  const { L, T, R, M = 1, f01 = 0, stage = "ms" } = state;

  starGroup.scale.setScalar(R);

  // --- BRIGHTNESS (teaching-friendly) ---
  const glow = clamp(Math.log10(L + 1) * 1.35 + 1.55, 1.4, 9.0);

  // --- COLOR (mass-aware: big stars start bluer then drift toward white) ---
  const big = clamp(Math.log10(Math.max(0.1, M)), 0, 2);
  const startBoost = 1.0 + 0.35 * big;
  const timeCool = 1.0 + 0.55 * big * f01;
  const T_for_color = (T * startBoost) / timeCool;

  const c = colorFromTempK(T_for_color);

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

  // --- Dust disk (protostar only) ---
  if (disk) {
    const shrink = Math.pow(1.0 - f01, 1.6);
    const baseOuter = 2.8;
    const outer = (0.6 + baseOuter * shrink) * Math.max(0.95, R);

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
    camera.position.z = clamp(camera.position.z + delta, 2, 30);
    aimCamera();
  }

  domElement.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoomBy(Math.sign(e.deltaY) * 0.6);
    },
    { passive: false }
  );

  zoomInBtn?.addEventListener("click", () => zoomBy(-0.8));
  zoomOutBtn?.addEventListener("click", () => zoomBy(+0.8));
}

// render.js (add this helper)
export function makeStarMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0xffffff) },
      uGlow: { value: 2.2 },            // global brightness (2..6)
      uGranuleStrength: { value: 0.85 },// texture contrast (0.4..1.2)
      uLimb: { value: 0.65 },           // limb darkening strength (0.45..0.85)
      uSpotStrength: { value: 0.10 },   // keep low or it looks like planet craters
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
      uniform vec3 uColor;
      uniform float uGlow;
      uniform float uGranuleStrength;
      uniform float uLimb;
      uniform float uSpotStrength;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }

      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f*f*(3.0-2.0*f);
        return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
      }

      float fbm(vec2 p){
        float v = 0.0;
        float a = 0.55;
        for(int i=0;i<7;i++){          // more octaves -> less “blocky”
          v += a * noise(p);
          p *= 2.0;
          a *= 0.55;
        }
        return v;
      }

      void main() {
        vec3 N = normalize(vNormalW);

        // Seamless-ish mapping from normal
        float u = atan(N.z, N.x) / 6.2831853 + 0.5;
        float v = asin(N.y) / 3.1415926 + 0.5;
        vec2 p = vec2(u, v);

        // two moving layers (small-scale dominates so it reads like “granulation”)
        float t = uTime * 0.12;
        float s1 = fbm(p * 85.0 + vec2( t*0.8, -t*0.6));
        float s2 = fbm(p * 140.0 + vec2(-t*0.5,  t*0.9));
        float g  = mix(s1, s2, 0.55);

        // turn noise into “cell walls” (bright network) + softer interior
        float cells = smoothstep(0.52, 0.78, g);          // bright ridges
        float interior = 1.0 - smoothstep(0.20, 0.65, g); // darker pockets
        float gran = 0.65*cells + 0.35*(1.0 - interior);

        // sparse spots (keep subtle)
        float spotField = fbm(p * 10.0 + vec2(t*0.08, t*0.05));
        float spots = smoothstep(0.72, 0.88, spotField);

        // view-dependent limb darkening
        vec3 Vdir = normalize(cameraPosition - vPosW);
        float ndv = clamp(dot(N, Vdir), 0.0, 1.0);
        float limb = pow(ndv, 1.0 - uLimb);

        // brightness: base + granulation contrast
        float bright = 1.0 + uGranuleStrength * (gran - 0.5);
        bright *= (1.0 - uSpotStrength * spots);

        vec3 col = uColor * bright * uGlow;
        col *= mix(0.55, 1.0, limb);

        // soft clip so we don't blow to flat white under ACES
        col = col / (vec3(1.0) + col);

gl_FragColor = vec4(col, 1.0);

        // limb darkening
        col *= mix(0.55, 1.0, limb);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}


