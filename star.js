// star.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

import { getTimeUI, getStarReadouts, createMsController } from "./ui.js";
import { mainSequenceState, protostarState, absMagnitudeFromLuminosity } from "./models.js";
import { createStarScene, applyStarVisuals, setupDragControls, setupZoomControls } from "./render.js";

const timeUI = getTimeUI();
const [preSlider, msSlider, postSlider] = timeUI.sliders;
const [prePlay, msPlay, postPlay] = timeUI.playButtons;
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

function formatAge(years) {
  if (years < 1e6) return `${Math.round(years / 1e3)} thousand years`;
  if (years < 1e9) return `${(years / 1e6).toFixed(1)} million years`;
  return `${(years / 1e9).toFixed(2)} billion years`;
}

function setReadoutsFromState({ L, T, ageYears }, stageName) {
  const absMag = absMagnitudeFromLuminosity(L);
  readouts.absMagEl && (readouts.absMagEl.textContent = absMag.toFixed(2));
  readouts.surfTempEl && (readouts.surfTempEl.textContent = `${Math.round(T)} K`);
  readouts.stageEl && (readouts.stageEl.textContent = stageName);
  readouts.ageEl && (readouts.ageEl.textContent = formatAge(ageYears));
  readouts.massEl && (readouts.massEl.textContent = `${STAR.mass.toFixed(STAR.mass < 1 ? 1 : 0)} M☉`);
}

function applyProtostar(f01) {
  const state = protostarState(STAR.mass, f01);
  applyStarVisuals(RENDER, { ...state, M: STAR.mass, f01, stage: "proto" });
  setReadoutsFromState(state, "Protostar");
}

function applyMainSequence(f01) {
  const state = mainSequenceState(STAR.mass, f01);
  applyStarVisuals(RENDER, { ...state, M: STAR.mass, f01, stage: "ms" });
  setReadoutsFromState(state, "Main sequence");
}

function setMass(M) {
  if (!Number.isFinite(M)) return;
  STAR.mass = M;

  const preV = (parseFloat(preSlider.value) || 0) / 100;
  const msV = (parseFloat(msSlider.value) || 0) / 100;

  if (msV > 0) applyMainSequence(msV);
  else applyProtostar(preV);
}

massSelect?.addEventListener("change", () => setMass(parseFloat(massSelect.value)));


postSlider?.addEventListener("input", () => (postPct.textContent = postSlider.value));

prePct.textContent = preSlider?.value ?? "0";
msPct.textContent = msSlider?.value ?? "0";
postPct.textContent = postSlider?.value ?? "0";

// PRE play/pause controller
createMsController({
  slider: preSlider,
  playBtn: prePlay,
  pctEl: prePct,
  onChange01: (f01) => {
    msSlider.value = "0"; msPct.textContent = "0";
    postSlider.value = "0"; postPct.textContent = "0";
    applyProtostar(f01);
  },
  intervalMs: 60,
});

// MS play/pause controller
createMsController({
  slider: msSlider,
  playBtn: msPlay,
  pctEl: msPct,
  onChange01: (f01) => {
    preSlider.value = "100"; prePct.textContent = "100";
    postSlider.value = "0"; postPct.textContent = "0";
    applyMainSequence(f01);
  },
  intervalMs: 60,
});

// Start
if (massSelect) setMass(parseFloat(massSelect.value));
applyProtostar((parseFloat(preSlider.value) || 0) / 100);

// Animate
let lastT = performance.now();
const toCam = new THREE.Vector3();

function animate(t) {
  const dt = (t - lastT) / 1000;
  lastT = t;

  RENDER.starGroup.rotation.y += STAR.spin * dt;

  // advance shader time (if shader is in use)
  const mat = RENDER.starMat;
  if (mat?.uniforms?.uTime) mat.uniforms.uTime.value = t * 0.001;

  toCam.subVectors(RENDER.camera.position, RENDER.starGroup.position).normalize();
  RENDER.halo.position
    .copy(RENDER.starGroup.position)
    .addScaledVector(toCam, -0.15 * RENDER.starGroup.scale.x);

  RENDER.renderer.render(RENDER.scene, RENDER.camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
