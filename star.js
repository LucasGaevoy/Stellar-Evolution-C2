import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// ---- DOM ----
const container = document.getElementById("scene");
const slider = document.getElementById("mass");
const massValue = document.getElementById("massValue");

const zoomInBtn = document.getElementById("zoomIn");
const zoomOutBtn = document.getElementById("zoomOut");

// ---- Scene ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f18);

// ---- Camera ----
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
camera.position.set(0, 1.5, 7);
camera.lookAt(0, 0.3, 0);

// ---- Renderer ----
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

// ---- Environment (grid floor) ----
const grid = new THREE.GridHelper(18, 18);
grid.position.y = -1.6;
scene.add(grid);

// ---- Star ----
const star = new THREE.Mesh(
  new THREE.SphereGeometry(1, 48, 48), // radius = 1 baseline
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
  massValue.textContent = M.toFixed(1);

  const R = mainSequenceRadius(M);
  star.scale.setScalar(R);
}

slider.addEventListener("input", updateFromMass);
updateFromMass();

let dragging = false;
let lastX = 0;
let lastY = 0;

renderer.domElement.addEventListener("mousedown", (e) => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
});

window.addEventListener("mouseup", () => dragging = false);

window.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;

  star.rotation.y += dx * 0.01;
  star.rotation.x += dy * 0.01;
});

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

zoomInBtn.addEventListener("click", () => zoomBy(-0.8));
zoomOutBtn.addEventListener("click", () => zoomBy(+0.8));


// ---- Render loop ----
function animate() {
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();