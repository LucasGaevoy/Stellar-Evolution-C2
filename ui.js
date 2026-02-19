// ui.js
// DOM + controllers only (no physics, no THREE)

export function getTimeUI() {
  const sliders = [
    document.getElementById("time-pre"),
    document.getElementById("time-ms"),
    document.getElementById("time-post"),
  ];
  const playButtons = [
    document.getElementById("play-pre"),
    document.getElementById("play-ms"),
    document.getElementById("play-post"),
  ];
  const outputs = [
    document.getElementById("pct-pre"),
    document.getElementById("pct-ms"),
    document.getElementById("pct-post"),
  ];

  if (sliders.some(x => !x) || playButtons.some(x => !x) || outputs.some(x => !x)) {
    console.error("Time UI missing:", { sliders, playButtons, outputs });
  }

  return { sliders, playButtons, outputs };
}

export function getStarReadouts() {
  return {
    absMagEl: document.getElementById("absMag"),
    surfTempEl: document.getElementById("surfTemp"),
    stageEl: document.getElementById("stage"),
    ageEl: document.getElementById("age"),
    massEl: document.getElementById("massReadout"),
  };
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Generic slider play/pause controller.
 * Keeps:
 *  - slider value
 *  - percent label (pctEl)
 * in sync, and calls onChange01(f) with f in [0,1].
 */
export function createStageController({
  slider,
  playBtn,
  pctEl,
  onChange01,
  intervalMs = 80,
  step = 1,
  loop = false,
}) {
  if (!slider || !playBtn || !pctEl) {
    console.error("createStageController missing elements:", { slider, playBtn, pctEl });
    // Return harmless no-ops so star.js doesn't crash
    const noop = () => {};
    return { setPct: noop, start: noop, stop: noop, isPlaying: () => false };
  }

  let timer = null;

  function setPct(v) {
    const clamped = clamp(v, 0, 100);
    slider.value = String(clamped);
    pctEl.textContent = String(clamped);
    onChange01(clamped / 100);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    playBtn.innerHTML = "&#9654;"; // play
  }

  function start() {
    const current = parseInt(slider.value, 10) || 0;
    if (current >= 100) setPct(loop ? 0 : 0);

    playBtn.innerHTML = "&#9208;"; // pause
    timer = setInterval(() => {
      const v = parseInt(slider.value, 10) || 0;
      if (v >= 100) {
        if (loop) setPct(0);
        else stop();
        return;
      }
      setPct(v + step);
    }, intervalMs);
  }

  playBtn.addEventListener("click", () => (timer ? stop() : start()));

  // When user drags manually, stop autoplay and apply immediately
  slider.addEventListener("input", () => {
    if (timer) stop();
    setPct(parseInt(slider.value, 10) || 0);
  });

  // Initialize label to current slider value
  pctEl.textContent = slider.value;

  return { setPct, start, stop, isPlaying: () => !!timer };
}

/**
 * Backwards-compatible alias (so you don't have to rename imports).
 * Use it for pre/ms/post equally.
 */
export function createMsController(opts) {
  return createStageController(opts);
}
