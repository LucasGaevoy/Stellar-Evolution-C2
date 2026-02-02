import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

import { getTimeUI } from "./ui.js";
const timeUI = getTimeUI();
const [preSlider, msSlider, postSlider] = timeUI.sliders;
const [prePlay, msPlay, postPlay] = timeUI.playButtons;
const [prePct, msPct, postPct] = timeUI.outputs;


// Initialize main sequence state
msPct.textContent = msSlider.value;


// ---------- DOM ----------
const container = document.getElementById("scene");
/*const slider = document.getElementById("MassRange");
const massInput = document.getElementById("MassInput");*/
//I will need to delete these two lines as we're not using the mass slider anymore.
const massSelect = document.getElementById("MassValues");
massSelect?.addEventListener("change",()=>{
  const M = parseFloat(massSelect.value);
  setMass(M);
})
const zoomInBtn = document.getElementById("zoomIn");
const zoomOutBtn = document.getElementById("zoomOut");

const STAR = {
  mass: 1.0,
  radius: 1.0,
  luminosity: 1.0,
  spin: 0.25, // rad/s
};

// THREE SETUP
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f18);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
camera.position.set(0, 1.5, 7);
camera.lookAt(0, 0.3, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

function resize() {
  const r = container.getBoundingClientRect();
  const w = Math.max(1, Math.floor(r.width));
  const h = Math.max(1, Math.floor(r.height));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// ENVIRONMENT
const grid = new THREE.GridHelper(18, 18);
grid.position.y = -1.6;
scene.add(grid);

scene.add(new THREE.AmbientLight(0xffffff, 0.25));
const key = new THREE.DirectionalLight(0xffffff, 0.7);
key.position.set(3, 3, 3);
scene.add(key);



// STAR
const starMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.55,
  metalness: 0.0,
  emissive: new THREE.Color(0xffffff),
  emissiveIntensity: 1.0,
});

const starGroup = new THREE.Group();
starGroup.position.y = 0.3;
scene.add(starGroup);

const star = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 48), starMat);
starGroup.add(star);

// light emitted into scene (so grid brightens near star)
const starLight = new THREE.PointLight(0xffffff, 2.0, 35, 2.0);
starLight.position.copy(starGroup.position);
scene.add(starLight);

// HALO (stable) 
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

// ---------- MODELS ----------
function radiusFromMass(M) {
  if (M <= 1) return Math.pow(M, 0.8);
  if (M <= 10) return Math.pow(M, 0.57);
  return Math.pow(M, 0.3) * Math.pow(10, 0.27);
}
function luminosityFromMass(M) {
  return Math.pow(M, 3.5);
}

// MAIN SEQUENCE EVOLUTION
// - L ~ M^3.5 (baseline)
// - Star becomes slightly more luminous with time
// - Star becomes cooler with time (orange -> red)
// - Lifetime ~ M^-2.5, Sun ~ 10 billion years

function mainSequenceLifetimeYears(M) {
  // Calibrate so 1 Msun -> 1e10 years
  return 1e10 * Math.pow(M, -2.5);
}

// crude baseline Teff scaling (good enough for a visual sim)
function baseTeffK(M) {
  // 1 Msun ~ 5800K, higher mass hotter
  return 5800 * Math.pow(M, 0.55);
}

// slider fraction f in [0,1] across main sequence
function mainSequenceState(M, f) {
  const L0 = luminosityFromMass(M);

  // luminosity rises over MS (Sun rises ~30-40% over MS; use 0.4 as a nice visual)
  const L = L0 * (1.0 + 0.40 * f);

  // temperature falls a bit (visual: shift toward orange/red)
  const T0 = baseTeffK(M);
  const T = T0 * (1.0 - 0.30 * f);


  // radius gently increases (Sun grows a bit on MS)
  const R0 = radiusFromMass(M);
  const R = R0 * (1.0 + 0.12 * f);

  const ageYears = mainSequenceLifetimeYears(M) * f;

  return { L, T, R, ageYears };
}

// Convert temperature to an approximate star color (simple + stable)
function colorFromTempK(T) {
  // clamp to a plausible visible range
  const t = THREE.MathUtils.clamp(T, 2500, 40000);

  // Very lightweight approximation: interpolate between "red" and "blue-white"
  // Hot stars -> bluish white; cool stars -> orange/red
  const cool = new THREE.Color(0xffb066);  // orange-ish
  const mid  = new THREE.Color(0xffffff);  // white
  const hot  = new THREE.Color(0xa9c8ff);  // pale blue

  if (t < 6500) {
    const a = (t - 2500) / (6500 - 2500); // 0..1
    return cool.clone().lerp(mid, a);
  } else {
    const a = (t - 6500) / (40000 - 6500); // 0..1
    return mid.clone().lerp(hot, a);
  }
}

function absMagnitudeFromLuminosity(L) {
  return 4.83 - 2.5 * Math.log10(Math.max(L, 1e-9));
}

function setMass(M) {
  if (!Number.isFinite(M)) return;

  STAR.mass = M;

  // main sequence slider drives everything else
  if (msSlider) updateMainSequence(parseFloat(msSlider.value) / 100);
}
// ---------- UI ----------
/*function syncFromSlider() {
  const M = parseFloat(slider.value);
  setMass(M);
  if (massInput) massInput.value = String(M);
}
function syncFromInput() {
  const M = parseFloat(massInput.value);
  if (!Number.isFinite(M)) return;
  slider.value = String(M);
  setMass(M);
}
slider?.addEventListener("input", syncFromSlider);
massInput?.addEventListener("input", syncFromInput);
*/
// DRAG / ROTATE
let dragging = false,
  lastX = 0,
  lastY = 0;

renderer.domElement.addEventListener("mousedown", (e) => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
});
window.addEventListener("mouseup", () => (dragging = false));
window.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX,
    dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  starGroup.rotation.y += dx * 0.01;
  starGroup.rotation.x += dy * 0.01;
});

// ---------- ZOOM ----------
function zoomBy(delta) {
  camera.position.z = THREE.MathUtils.clamp(camera.position.z + delta, 2, 30);
}
renderer.domElement.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    zoomBy(Math.sign(e.deltaY) * 0.6);
  },
  { passive: false }
);
zoomInBtn?.addEventListener("click", () => zoomBy(-0.8));
zoomOutBtn?.addEventListener("click", () => zoomBy(+0.8));

// ---------- APPLY MAIN SEQUENCE TO SCENE ----------
const absMagEl = document.getElementById("absMag");
const surfTempEl = document.getElementById("surfTemp");
const stageEl = document.getElementById("stage");
const ageEl = document.getElementById("age");
const massEl = document.getElementById("massReadout");

function updateMainSequence(f) {
  const M = STAR.mass;

  const { L, T, R, ageYears } = mainSequenceState(M, f);

  // scale the star size
  STAR.radius = R;
  starGroup.scale.setScalar(R);

  // brightness scaling (log so it doesn't explode)
  const glow = THREE.MathUtils.clamp(Math.log10(L + 1) * 1.6 + 0.9, 0.9, 8.0);

  // apply emissive + light intensity
  starMat.emissiveIntensity = glow * 1.2;
  starLight.intensity = glow * 2.0;

  // apply temperature color shift
  const c = colorFromTempK(T);
  starMat.color.copy(c);

  starMat.emissive.copy(c).multiplyScalar(0.35);

  // halo reacts too
  halo.scale.setScalar(R * (2.8 + glow * 0.30));
  halo.material.opacity = THREE.MathUtils.clamp(0.20 + glow * 0.06, 0, 1);

  // text readouts
  const absMag = absMagnitudeFromLuminosity(L);

  if (absMagEl) absMagEl.textContent = absMag.toFixed(2);
  if (surfTempEl) surfTempEl.textContent = `${Math.round(T)} K`;
  if (stageEl) stageEl.textContent = "Main sequence";
  if (ageEl) ageEl.textContent = `${(ageYears / 1e9).toFixed(2)} billion years`;
  if (massEl) massEl.textContent = `${M.toFixed(M < 1 ? 1 : 0)} M☉`;
}

let msTimer = null;

function setMsValue(v) {
  const clamped = Math.max(0, Math.min(100, v));
  msSlider.value = String(clamped);
  msPct.textContent = msSlider.value;
  updateMainSequence(clamped / 100);
}

function stopMsPlay() {
  if (msTimer) clearInterval(msTimer);
  msTimer = null;
  msPlay.innerHTML = "&#9654;"; // play icon
}

function startMsPlay() {
  // if already at end, restart from 0
  if (parseInt(msSlider.value, 10) >= 100) setMsValue(0);

  msPlay.innerHTML = "&#9208;"; // pause icon
  msTimer = setInterval(() => {
    const v = parseInt(msSlider.value, 10) || 0;
    if (v >= 100) {
      stopMsPlay();
      return;
    }
    setMsValue(v + 1);
  }, 60);
}

// click toggles play/pause
msPlay.addEventListener("click", () => {
  if (msTimer) stopMsPlay();
  else startMsPlay();
});

// when user drags slider manually, stop autoplay (optional but nice)
msSlider.addEventListener("input", () => {
  if (msTimer) stopMsPlay();
  setMsValue(parseInt(msSlider.value, 10) || 0);
});

// --- Time slider wiring ---
preSlider.addEventListener("input", () => (prePct.textContent = preSlider.value));
postSlider.addEventListener("input", () => (postPct.textContent = postSlider.value));


prePct.textContent = preSlider.value;
msPct.textContent = msSlider.value;
postPct.textContent = postSlider.value;

// ---------- START + ANIMATE ----------
//setMass(parseFloat(slider?.value ?? "1"));
if (massSelect){
  setMass(parseFloat(massSelect.value));
}
updateMainSequence(parseFloat(msSlider.value) / 100);

let lastT = performance.now();
function animate(t) {
  const dt = (t - lastT) / 1000;
  lastT = t;

  starGroup.rotation.y += STAR.spin * dt;

  const starPos = starGroup.position;
  const toCam = new THREE.Vector3().subVectors(camera.position, starPos).normalize();
  halo.position.copy(starPos).addScaledVector(toCam, -0.15 * STAR.radius);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);




// CONSTANTS ----------------------
// Configure M = 1 on slider to be the mass of the Sun
// Spin of a star is highly dependent on its mass, and stars with solar masses below 1 will tend to spin a lot slower. Spin is also lost over time ( magnetic braking)

// ------------------- NEBULA PHASE/PROTOSTAR -----------------------
// If mass < 0.08 solar masses, it will become a brown dwarf
// Doesn't use hydrogen/helium stores, gravitional potential energy is converted to thermal energy

// ----------------- REDGIANT PHASE ------------------------

// In redgiant phase; in 0.5 billion years, its radius wil be 1.5 times bigger; 200x in the following 200 million years. | This depends on the mass of the redgiant, 
// The sun will spend a billion years in this phase
// as again, the lifetime of a redgiant is inversily porotional to the mass.
// A star with 8 solar masses will be classified as a super red giant, anything below is just a red giant.
// > 3 solar masses will end up as black holes
// > 10 solar masses will go supernova in a few million years
// Rate of helium loss is proportional to the lifetime of the redgiant

// ----------------- DWARF PHASE ---------------------------
// < 1.4 solar masses will end up as white dwarfs 
// Dwarf stars: white is done in a couple million years; to become brown/black dwarfs, trillions of years is needed
// Colour of a dwarf star dependent on time and temperature is 

// ---------------- NEUTRON STAR --------------------------
// > 1.4 but < 3 solar masses will end up as neutron stars
// pulsar phase is typically around 10-100 million years
// blue-white --> yellow --> orange

// ---------------- BLACK HOLE -----------------------------
// > 3 solar masses will end up as black holes
// Rate of mass loss is -(k/M^2), so small black holes evaporate much faster than large ones


