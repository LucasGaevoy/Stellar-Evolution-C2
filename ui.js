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