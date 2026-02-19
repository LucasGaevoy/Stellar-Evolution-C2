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

export function createMsController({ slider, playBtn, pctEl, onChange01, intervalMs = 60 }) {
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
    if ((parseInt(slider.value, 10) || 0) >= 100) setPct(0);
    playBtn.innerHTML = "&#9208;"; // pause
    timer = setInterval(() => {
      const v = parseInt(slider.value, 10) || 0;
      if (v >= 100) return stop();
      setPct(v + 1);
    }, intervalMs);
  }

  playBtn.addEventListener("click", () => (timer ? stop() : start()));
  slider.addEventListener("input", () => {
    if (timer) stop();
    setPct(parseInt(slider.value, 10) || 0);
  });

  pctEl.textContent = slider.value;
  return { setPct, start, stop, isPlaying: () => !!timer };
}


