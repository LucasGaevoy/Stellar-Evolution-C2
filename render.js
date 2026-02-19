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
    renderer.setSize(w, h, true); // IMPORTANT
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

  const starMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.55,
    metalness: 0.0,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 1.0,
  });

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

  function aimCamera() {
    camera.lookAt(starGroup.position);
  }
  aimCamera();

  return { scene, camera, renderer, starGroup, starMat, starLight, halo, resize, aimCamera };
}

export function colorFromTempK(T) {
  const t = clamp(T, 2500, 40000);

  // log scale spreads hot-star differences massively
  const x = (Math.log10(t) - Math.log10(2500)) / (Math.log10(40000) - Math.log10(2500)); // 0..1

  const cool = new THREE.Color(0xff6a3a); // red-orange
  const mid  = new THREE.Color(0xffffff); // white
  const hot  = new THREE.Color(0x4d86ff); // blue

  if (x < 0.55) {
    return cool.clone().lerp(mid, x / 0.55);
  } else {
    return mid.clone().lerp(hot, (x - 0.55) / (1 - 0.55));
  }
}

export function applyStarVisuals({ starGroup, starMat, starLight, halo, aimCamera }, { L, T, R }) {
  starGroup.scale.setScalar(R);

  const glow = clamp(Math.log10(L + 1) * 1.6 + 0.9, 0.9, 8.0);
  starMat.emissiveIntensity = glow * 1.2;
  starLight.intensity = glow * 2.0;

  const c = colorFromTempK(T);
  starMat.color.copy(c);
  starMat.emissive.copy(c).multiplyScalar(0.35);

  halo.scale.setScalar(R * (2.8 + glow * 0.30));
  halo.material.opacity = clamp(0.20 + glow * 0.06, 0, 1);

  aimCamera();
}

export function setupDragControls(domElement, starGroup) {
  let dragging = false, lastX = 0, lastY = 0;

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
