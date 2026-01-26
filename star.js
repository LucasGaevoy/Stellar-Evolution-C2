import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const container = document.getElementById("scene");
const slider = document.getElementById("MassRange");
const massInput = document.getElementById("MassInput");

const zoomInBtn = document.getElementById("zoomIn");
const zoomOutBtn = document.getElementById("zoomOut");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f18);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
camera.position.set(0, 1.5, 7);
camera.lookAt(0, 0.3, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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

// Environment 
const grid = new THREE.GridHelper(18, 18);
grid.position.y = -1.6;
scene.add(grid);

// Star
const star = new THREE.Mesh(
  new THREE.SphereGeometry(1, 48, 48),
  new THREE.MeshBasicMaterial({ color: 0xffcc66 })
);
star.position.y = 0.3;
scene.add(star);

function mainSequenceRadius(M) {
  if (M <= 1) return Math.pow(M, 0.8);
  if (M <= 10) return Math.pow(M, 0.57);
  return Math.pow(M, 0.3) * Math.pow(10, 0.27);
}

function updateFromMass() {
  const M = parseFloat(slider.value);
  if (Number.isNaN(M)) return;

  // scale star
  const R = mainSequenceRadius(M);
  star.scale.setScalar(R);
}

// Listen to BOTH inputs (because your HTML updates them)
slider.addEventListener("input", updateFromMass);
massInput.addEventListener("input", () => {
  const v = parseFloat(massInput.value);
  if (Number.isNaN(v)) return;
  slider.value = v;
  updateFromMass();
});

updateFromMass();

// --- Drag rotate ---
let dragging = false;
let lastX = 0;
let lastY = 0;

renderer.domElement.addEventListener("mousedown", (e) => {
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

  star.rotation.y += dx * 0.01;
  star.rotation.x += dy * 0.01;
});

// --- Scroll zoom ---
renderer.domElement.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    camera.position.z += Math.sign(e.deltaY) * 0.6;
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, 2, 30);
  },
  { passive: false }
);

function zoomBy(delta) {
  camera.position.z = THREE.MathUtils.clamp(camera.position.z + delta, 2, 30);
}

if (zoomInBtn) zoomInBtn.addEventListener("click", () => zoomBy(-0.8));
if (zoomOutBtn) zoomOutBtn.addEventListener("click", () => zoomBy(+0.8));

function animate() {
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// CONSTANTS ----------------------
// Configure M = 1 on slider to be the mass of the Sun
// Spin of a star is highly dependent on its mass, and stars with solar masses below 1 will tend to spin a lot slower. Spin is also lost over time ( magnetic braking)

// ------------------- NEBULA PHASE/PROTOSTAR -----------------------
// If mass < 0.08 solar masses, it will become a brown dwarf
// Doesn't use hydrogen/helium stores, gravitional potential energy is converted to thermal energy

// ------------------ Main Sequence ----------------------
// Sun is 3.828 * 10^26 W
// Luminosity is directionally proportional to M^3.5
// A star double the mass of the Sun will be about 11.3 times as luminous ( 2^3.5)
// Become slightly more luminous with time, and become cooler, so go from orange to red
// Lifetime (T) is inversily proportional to M^2.5
// Sun will be in main sequence for about 10 billion years 
// Rate of hydrogen loss is inversily proportional to M^2.5

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


