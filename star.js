// star.js
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

import { getTimeUI, getStarReadouts, createStageController } from "./ui.js";
import { createStarScene, applyStarVisuals, setupDragControls, setupZoomControls } from "./render.js";

import {
  protostarState,
  protostarDurationYears,
  mainSequenceState,
  mainSequenceLifetimeYears,
  postMainSequenceState,
  absMagnitudeFromLuminosity
} from "./models.js";

const timeUI = getTimeUI();
const [preSlider, msSlider, postSlider] = timeUI.sliders;
const [prePlay, msPlay, postPlay] = timeUI.playButtons;
const [prePct, msPct, postPct] = timeUI.outputs;

const container = document.getElementById("scene");
const massSelect = document.getElementById("MassValues");
const zoomInBtn = document.getElementById("zoomIn");
const zoomOutBtn = document.getElementById("zoomOut");

const readouts = getStarReadouts();


const BASE_SPIN = 0.25;
const STAR = { mass: 1.0, spin: BASE_SPIN };
let activeStage = "pre";  
let targetF01 = 0.0;      
let currentF01 = 0.0;      
const RENDER = createStarScene(container);

const fColor = 1.0;
activeStage = "pre";
targetF01 = (parseFloat(preSlider.value) || 0) / 100;
currentF01 = targetF01;
applyProtostar(currentF01);

function smoothTo(current, target, dt, sharpness = 10) {
  // Exponential smoothing: higher sharpness = faster catch-up
  const a = 1 - Math.exp(-sharpness * dt);
  return current + (target - current) * a;
}

function switchStage(stage, f01) {
  const changed = (activeStage !== stage);
  activeStage = stage;
  targetF01 = f01;

  // Snap only once when you switch stage (pre->ms->post), not every update tick
  if (changed) currentF01 = f01;
}

setupDragControls(RENDER.renderer.domElement, RENDER.starGroup);
setupZoomControls({
  camera: RENDER.camera,
  domElement: RENDER.renderer.domElement,
  zoomInBtn,
  zoomOutBtn,
  aimCamera: RENDER.aimCamera,
});

function formatAge(years) {
  if (!Number.isFinite(years)) return "—";
  if (years < 1e6) return `${Math.round(years / 1e3)} thousand years`;
  if (years < 1e9) return `${(years / 1e6).toFixed(1)} million years`;
  return `${(years / 1e9).toFixed(2)} billion years`;
}

function setReadoutsFromState({ L, T, ageYears }, stageName) {
  const absMag = absMagnitudeFromLuminosity(L);
  if (readouts.absMagEl) readouts.absMagEl.textContent = Number.isFinite(absMag) ? absMag.toFixed(2) : "—";
  if (readouts.surfTempEl) readouts.surfTempEl.textContent = Number.isFinite(T) ? `${Math.round(T)} K` : "—";
  if (readouts.stageEl) readouts.stageEl.textContent = stageName ?? "—";
  if (readouts.ageEl) readouts.ageEl.textContent = formatAge(ageYears);
  if (readouts.massEl) readouts.massEl.textContent = `${STAR.mass.toFixed(STAR.mass < 1 ? 1 : 0)} M☉`;
}

function resetOtherStages(which) {
  if (which !== "pre") {
    preSlider.value = "100";
    prePct.textContent = "100";
  }
  if (which !== "ms") {
    msSlider.value = which === "pre" ? "0" : "100";
    msPct.textContent = msSlider.value;
  }
  if (which !== "post") {
    postSlider.value = "0";
    postPct.textContent = "0";
  }
}

function applyProtostar(f01) {
  const state = protostarState(STAR.mass, f01, 0);
  STAR.spin = BASE_SPIN * (state.spinMul ?? 1.0);
  applyStarVisuals(RENDER, { ...state, M: STAR.mass, f01, stage: "proto" });
  setReadoutsFromState(state, "Protostar");
  if (window.hrChart) window.hrChart.record("preMS",f01,state.L,state.T);
}

function applyMainSequence(f01) {
  const preAge = protostarDurationYears(STAR.mass);
  const state = mainSequenceState(STAR.mass, f01, preAge);
  STAR.spin = BASE_SPIN * (state.spinMul ?? 1.0);
  applyStarVisuals(RENDER, { ...state, M: STAR.mass, f01, stage: "ms" });
  setReadoutsFromState(state, "Main sequence");
  if (window.hrChart) window.hrChart.record("MS",f01,state.L,state.T);
}

function applyPostMainSequence(f01) {
  const preAge = protostarDurationYears(STAR.mass);
  const msAge = mainSequenceLifetimeYears(STAR.mass);
  const offset = preAge + msAge;

  const state = postMainSequenceState(STAR.mass, f01, offset);
    STAR.spin = 0.25 * (state.spinMul ?? 1.0);

  let stageName = "After main sequence";
  if (state?.remnant === "giant") stageName = "Red giant";
  if (state?.remnant === "wd") stageName = "White dwarf";
  if (state?.remnant === "ns") stageName = "Neutron star";
  if (state?.remnant === "bh") stageName = "Black hole";

  const fColor = 1.0 + 0.2 * f01; // small continuation (tweak 0.2–0.6)
  applyStarVisuals(RENDER, { ...state, M: STAR.mass, f01, fColor, stage: state?.remnant ?? "post" });
  setReadoutsFromState(state, stageName);
  if (window.hrChart) window.hrChart.record("postMS",f01,state.L,state.T);
}

function setMass(M) {
  if (!Number.isFinite(M)) return;
  STAR.mass = M;
}

massSelect?.addEventListener("change", () => setMass(parseFloat(massSelect.value)));

prePct.textContent = preSlider?.value ?? "0";
msPct.textContent = msSlider?.value ?? "0";
postPct.textContent = postSlider?.value ?? "0";

createStageController({
  slider: preSlider,
  playBtn: prePlay,
  pctEl: prePct,
  onChange01: (f01) => {
    resetOtherStages("pre");
    switchStage("pre", f01);
  },
  intervalMs: 150,
});

createStageController({
  slider: msSlider,
  playBtn: msPlay,
  pctEl: msPct,
  onChange01: (f01) => {
    resetOtherStages("ms");
    switchStage("ms", f01);
  },
  intervalMs: 150,
});

createStageController({
  slider: postSlider,
  playBtn: postPlay,
  pctEl: postPct,
  onChange01: (f01) => {
    resetOtherStages("post");
    switchStage("post", f01);
  },
  intervalMs: 150,
});

if (massSelect) setMass(parseFloat(massSelect.value));
applyProtostar((parseFloat(preSlider.value) || 0) / 100);

let lastT = performance.now();
const toCam = new THREE.Vector3();
if (RENDER.blackHole && RENDER.blackHole.disk?.visible) {
    RENDER.blackHole.update(t * 0.001, toCam, RENDER.starGroup.scale.x);
}

function animate(t) {
  const dt = (t - lastT) / 1000;
  currentF01 = smoothTo(currentF01, targetF01, dt, 12); // tweak 8–20

  if (activeStage === "pre") applyProtostar(currentF01);
  else if (activeStage === "ms") applyMainSequence(currentF01);
  else applyPostMainSequence(currentF01);
  lastT = t;

  RENDER.starGroup.rotation.y += STAR.spin * dt;

  const mat = RENDER.starMat;
  if (mat?.uniforms?.uTime) mat.uniforms.uTime.value = t * 0.001;

  toCam.subVectors(RENDER.camera.position, RENDER.starGroup.position).normalize();
  RENDER.halo.position
    .copy(RENDER.starGroup.position)
    .addScaledVector(toCam, -0.15 * RENDER.starGroup.scale.x);

  if (RENDER.shell) {
    RENDER.shell.position.copy(RENDER.starGroup.position);
    RENDER.shell.position.addScaledVector(toCam, -0.15 * RENDER.starGroup.scale.x);
  }

  RENDER.renderer.render(RENDER.scene, RENDER.camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);