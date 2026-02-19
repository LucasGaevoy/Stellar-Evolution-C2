// star.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

import { getTimeUI, getStarReadouts, createMsController } from "./ui.js";
import { mainSequenceState, absMagnitudeFromLuminosity } from "./models.js";
import { createStarScene, applyStarVisuals, setupDragControls, setupZoomControls } from "./render.js";

const timeUI = getTimeUI();
const [preSlider, msSlider, postSlider] = timeUI.sliders;
const [, msPlay] = timeUI.playButtons;
const [prePct, msPct, postPct] = timeUI.outputs;

const container = document.getElementById("scene");
const massSelect = document.getElementById("MassValues");
const zoomInBtn = document.getElementById("zoomIn");
const zoomOutBtn = document.getElementById("zoomOut");

const readouts = getStarReadouts();

const STAR = { mass: 1.0, spin: 0.25 };
const RENDER = createStarScene(container);

setupDragControls(RENDER.renderer.domElement, RENDER.starGroup);
setupZoomControls({
  camera: RENDER.camera,
  domElement: RENDER.renderer.domElement,
  zoomInBtn,
  zoomOutBtn,
  aimCamera: RENDER.aimCamera,
});

function setReadoutsFromState({ L, T, ageYears }) {
  const absMag = absMagnitudeFromLuminosity(L);

  readouts.absMagEl && (readouts.absMagEl.textContent = absMag.toFixed(2));
  readouts.surfTempEl && (readouts.surfTempEl.textContent = `${Math.round(T)} K`);
  readouts.stageEl && (readouts.stageEl.textContent = "Main sequence");
  readouts.ageEl && (readouts.ageEl.textContent = `${(ageYears / 1e9).toFixed(2)} billion years`);
  readouts.massEl && (readouts.massEl.textContent = `${STAR.mass.toFixed(STAR.mass < 1 ? 1 : 0)} M☉`);
}

function applyMainSequence(f01) {
  const state = mainSequenceState(STAR.mass, f01);
  applyStarVisuals(RENDER, state);
  setReadoutsFromState(state);
}

function setMass(M) {
  if (!Number.isFinite(M)) return;
  STAR.mass = M;
  applyMainSequence((parseFloat(msSlider.value) || 0) / 100);
}

massSelect?.addEventListener("change", () => setMass(parseFloat(massSelect.value)));

// Pre/Post sliders: for now only update the % text
preSlider?.addEventListener("input", () => (prePct.textContent = preSlider.value));
postSlider?.addEventListener("input", () => (postPct.textContent = postSlider.value));

prePct.textContent = preSlider?.value ?? "0";
msPct.textContent = msSlider?.value ?? "0";
postPct.textContent = postSlider?.value ?? "0";

// MS play/pause + dragging slider updates applyMainSequence automatically
createMsController({
  slider: msSlider,
  playBtn: msPlay,
  pctEl: msPct,
  onChange01: applyMainSequence,
  intervalMs: 60,
});

// Start state
if (massSelect) setMass(parseFloat(massSelect.value));
applyMainSequence((parseFloat(msSlider.value) || 0) / 100);

// Animate loop (rotation + halo positioning)
let lastT = performance.now();
const toCam = new THREE.Vector3();

function animate(t) {
  const dt = (t - lastT) / 1000;
  lastT = t;

  RENDER.starGroup.rotation.y += STAR.spin * dt;

  toCam.subVectors(RENDER.camera.position, RENDER.starGroup.position).normalize();
  RENDER.halo.position
    .copy(RENDER.starGroup.position)
    .addScaledVector(toCam, -0.15 * RENDER.starGroup.scale.x);

  RENDER.renderer.render(RENDER.scene, RENDER.camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
