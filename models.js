export function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

export function clamp01(x) {
  return clamp(x, 0, 1);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smooth01(x) {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
}

export function radiusFromMass(M) {
  if (M <= 1) return Math.pow(M, 0.8);
  if (M <= 10) return Math.pow(M, 0.57);
  return Math.pow(M, 0.3) * Math.pow(10, 0.27);
}

export function luminosityFromMass(M) {
  return Math.pow(M, 3.5);
}

export function mainSequenceLifetimeYears(M) {
  return 1e10 * Math.pow(M, -2.5);
}

export function baseTeffK(M) {
  return 5800 * Math.pow(M, 0.55);
}

export function absMagnitudeFromLuminosity(L) {
  return 4.83 - 2.5 * Math.log10(Math.max(L, 1e-9));
}

export function protostarDurationYears(M) {
  return 5e7 * Math.pow(M, -1.4);
}

export function mainSequenceState(M, f01, ageOffsetYears = 0) {
  const t = clamp01(f01);
  const L0 = luminosityFromMass(M);
  const T0 = baseTeffK(M);
  const R0 = radiusFromMass(M);

  const L = L0 * (1.0 + 0.40 * t);
  const T = T0 * (1.0 - 0.55 * t);
  const R = R0 * (1.0 + 0.35 * t);

  const ageYears = ageOffsetYears + mainSequenceLifetimeYears(M) * t;
  return { L, T, R, ageYears };
}

export function protostarState(M, f01, ageOffsetYears = 0) {
  const t = clamp01(f01);
  const zams = mainSequenceState(M, 0);

  const RmultStart = 3.2;
  const Rmult = RmultStart - (RmultStart - 1.0) * t;
  const R = zams.R * Rmult;

  const TmultStart = 0.55;
  const Tmult = TmultStart + (1.0 - TmultStart) * t;
  const T = zams.T * Tmult;

  const L = zams.L * Math.pow(R / zams.R, 2) * Math.pow(T / zams.T, 4);

  const ageYears = ageOffsetYears + protostarDurationYears(M) * t;
  return { L, T, R, ageYears };
}

export function postMainSequenceDurationYears(M) {
  if (M <= 0.2) return 1.2e11;
  if (M <= 0.7) return 6.0e10;
  if (M <= 1.3) return 1.6e10;
  return 8e5 * Math.pow(M / 10, -0.7);
}

export function postMainSequenceState_0p1(f01, ageOffsetYears = 0) {
  const t = clamp01(f01);

  const L_start = 0.003;
  const T_start = 3100;
  const R_start = 0.13;

  const L_end = 0.0003;
  const T_end = 9000;
  const R_end = 0.012;

  const s = smooth01(t);

  const L = lerp(L_start, L_end, s);
  const T = lerp(T_start, T_end, s);
  const R = lerp(R_start, R_end, s);

  const ageYears = ageOffsetYears + postMainSequenceDurationYears(0.1) * t;
  return { L, T, R, ageYears, remnant: "wd", ejecta: 0, shellR: R };
}

export function postMainSequenceState_0p5(f01, ageOffsetYears = 0) {
  const t = clamp01(f01);
  const dur = postMainSequenceDurationYears(0.5);

  const a = 0.62;
  const b = 0.78;

  const s1 = smooth01(clamp01(t / a));
  const s2 = smooth01(clamp01((t - a) / (b - a)));
  const s3 = smooth01(clamp01((t - b) / (1 - b)));

  const L_ms_end = luminosityFromMass(0.5) * 1.35;
  const T_ms_end = baseTeffK(0.5) * 0.65;
  const R_ms_end = radiusFromMass(0.5) * 1.25;

  const L_rg = 450;
  const T_rg = 3600;
  const R_rg = 70;

  const L_wd_hot = 12;
  const T_wd_hot = 22000;
  const R_wd = 0.013;

  const L_wd_cool = 0.0012;
  const T_wd_cool = 8500;

  let L, T, R, ejecta, shellR;

  if (t <= a) {
    L = lerp(L_ms_end, L_rg, s1);
    T = lerp(T_ms_end, T_rg, s1);
    R = lerp(R_ms_end, R_rg, s1);
    ejecta = 0;
    shellR = R;
  } else if (t <= b) {
    L = lerp(L_rg, L_wd_hot, s2);
    T = lerp(T_rg, T_wd_hot, s2);
    R = lerp(R_rg, R_wd, s2);
    ejecta = 1.0 - s2;
    shellR = lerp(R_rg, R_rg * 3.5, s2);
  } else {
    L = lerp(L_wd_hot, L_wd_cool, s3);
    T = lerp(T_wd_hot, T_wd_cool, s3);
    R = R_wd;
    ejecta = 0;
    shellR = R;
  }

  const ageYears = ageOffsetYears + dur * t;
  return { L, T, R, ageYears, remnant: "wd", ejecta, shellR };
}

export function postMainSequenceState_1p0(f01, ageOffsetYears = 0) {
  const t = clamp01(f01);
  const dur = postMainSequenceDurationYears(1.0);

  const a = 0.60;
  const b = 0.76;

  const s1 = smooth01(clamp01(t / a));
  const s2 = smooth01(clamp01((t - a) / (b - a)));
  const s3 = smooth01(clamp01((t - b) / (1 - b)));

  const L_ms_end = luminosityFromMass(1.0) * 1.40;
  const T_ms_end = baseTeffK(1.0) * 0.62;
  const R_ms_end = radiusFromMass(1.0) * 1.35;

  const L_rg = 1800;
  const T_rg = 3400;
  const R_rg = 180;

  const L_wd_hot = 45;
  const T_wd_hot = 30000;
  const R_wd = 0.012;

  const L_wd_cool = 0.0009;
  const T_wd_cool = 8000;

  let L, T, R, ejecta, shellR;

  if (t <= a) {
    L = lerp(L_ms_end, L_rg, s1);
    T = lerp(T_ms_end, T_rg, s1);
    R = lerp(R_ms_end, R_rg, s1);
    ejecta = 0;
    shellR = R;
  } else if (t <= b) {
    L = lerp(L_rg, L_wd_hot, s2);
    T = lerp(T_rg, T_wd_hot, s2);
    R = lerp(R_rg, R_wd, s2);
    ejecta = 1.0 - s2;
    shellR = lerp(R_rg, R_rg * 4.0, s2);
  } else {
    L = lerp(L_wd_hot, L_wd_cool, s3);
    T = lerp(T_wd_hot, T_wd_cool, s3);
    R = R_wd;
    ejecta = 0;
    shellR = R;
  }

  const ageYears = ageOffsetYears + dur * t;
  return { L, T, R, ageYears, remnant: "wd", ejecta, shellR };
}

export function remnantTypeFromMass(M) {
  if (M >= 25) return "bh";
  if (M >= 8) return "ns";
  return "wd";
}

export function massivePostMsDurationYears(M) {
  return 8e5 * Math.pow(M / 10, -0.7);
}

export function neutronStarState(M, f01, ageOffsetYears = 0) {
  const t = clamp01(f01);
  const dur = massivePostMsDurationYears(M);

  const R_start = 0.30;
  const R_end = 0.06;
  const R = lerp(R_start, R_end, smooth01(t));

  const T_start = 2.5e6;
  const T_end = 7.0e5;
  const T = lerp(T_start, T_end, smooth01(t));

  const L_start = 2e4;
  const L_end = 2e2;
  const L = lerp(L_start, L_end, smooth01(t));

  const ageYears = ageOffsetYears + dur * t;
  return { L, T, R, ageYears, remnant: "ns", ejecta: 0, shellR: R };
}

export function blackHoleState(M, f01, ageOffsetYears = 0) {
  const t = clamp01(f01);
  const dur = massivePostMsDurationYears(M);

  const R_start = 0.25;
  const R_end = 0.08;
  const R = lerp(R_start, R_end, smooth01(t));

  const T = 4000;
  const L = 0.02;

  const ageYears = ageOffsetYears + dur * t;
  return { L, T, R, ageYears, remnant: "bh", ejecta: 0, shellR: R };
}

export function postMainSequenceState_massive(M, f01, ageOffsetYears = 0) {
  const type = remnantTypeFromMass(M);
  if (type === "bh") return blackHoleState(M, f01, ageOffsetYears);
  if (type === "ns") return neutronStarState(M, f01, ageOffsetYears);
  return neutronStarState(M, f01, ageOffsetYears);
}

export function postMainSequenceState(M, f01, ageOffsetYears = 0) {
  if (M <= 0.2) return postMainSequenceState_0p1(f01, ageOffsetYears);
  if (M <= 0.7) return postMainSequenceState_0p5(f01, ageOffsetYears);
  if (M <= 1.3) return postMainSequenceState_1p0(f01, ageOffsetYears);
  return postMainSequenceState_massive(M, f01, ageOffsetYears);
}