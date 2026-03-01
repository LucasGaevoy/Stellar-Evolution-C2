// models.js

// ---------- helpers ----------
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

// ---------- simple scaling relations ----------
export function radiusFromMass(M) {
  // very rough MS scaling
  if (M <= 1) return Math.pow(M, 0.8);
  if (M <= 10) return Math.pow(M, 0.57);
  return Math.pow(M, 0.3) * Math.pow(10, 0.27);
}

export function luminosityFromMass(M) {
  // rough MS scaling
  return Math.pow(M, 3.5);
}

export function mainSequenceLifetimeYears(M) {
  // rough: t_MS ~ 1e10 * M^-2.5
  return 1e10 * Math.pow(M, -2.5);
}

export function baseTeffK(M) {
  // rough scaling
  return 5800 * Math.pow(M, 0.55);
}

export function absMagnitudeFromLuminosity(L) {
  return 4.83 - 2.5 * Math.log10(Math.max(L, 1e-9));
}

// ---------- pre-MS / MS ----------
export function protostarDurationYears(M) {
  return 5e7 * Math.pow(M, -1.4);
}

export function mainSequenceState(M, f01, ageOffsetYears = 0) {
  const t = clamp01(f01);
  const L0 = luminosityFromMass(M);
  const T0 = baseTeffK(M);
  const R0 = radiusFromMass(M);

  // Keep MS evolution gentle to avoid absurd cooling for high mass stars.
  // (Your old model cooled every star by 55%, which made 3 M☉ look too cool.)
  const L = L0 * (1.0 + 0.25 * t);
  const T = T0 * (1.0 - 0.12 * t);
  const R = R0 * (1.0 + 0.12 * t);

  const ageYears = ageOffsetYears + mainSequenceLifetimeYears(M) * t;
  return { L, T, R, ageYears, spinMul: 1.0 };
}

export function protostarState(M, f01, ageOffsetYears = 0) {
  const t = clamp01(f01);

  const zams = mainSequenceState(M, 0, 0);

  const RmultStart = 3.2;
  const Rmult = RmultStart - (RmultStart - 1.0) * t;
  const R = zams.R * Rmult;

  const TmultStart = 0.55;
  const Tmult = TmultStart + (1.0 - TmultStart) * t;
  const T = zams.T * Tmult;

  // Stefan-Boltzmann-ish
  const L = zams.L * Math.pow(R / zams.R, 2) * Math.pow(T / zams.T, 4);

  const ageYears = ageOffsetYears + protostarDurationYears(M) * t;
  return { L, T, R, ageYears, spinMul: 0.8 };
}

// ---------- post-MS durations ----------
export function postMainSequenceDurationYears(M) {
  // For teaching/visuals, keep these coarse
  if (M < 8.0) {
    // longer for low/intermediate
    if (M <= 0.2) return 1.2e11;
    if (M <= 0.7) return 6.0e10;
    if (M <= 1.3) return 1.6e10;
    return 3.0e9 * Math.pow(M / 2.0, -1.2); // intermediate (e.g., 3 M☉)
  }
  // massive: very short
  return 8e6 * Math.pow(M / 10.0, -0.7);
}

// ---------- low-mass WD tracks ----------
export function postMainSequenceState_0p1(f01, ageOffsetYears = 0) {
  const t = clamp01(f01);

  // Start from true MS end (continuity)
  const msEnd = mainSequenceState(0.1, 1.0, 0);
  const L_start = msEnd.L;
  const T_start = msEnd.T;
  const R_start = msEnd.R;

  // End: cool-ish WD
  const L_end = 0.0003;
  const T_end = 9000;
  const R_end = 0.012;

  const s = smooth01(t);

  const L = lerp(L_start, L_end, s);
  const T = lerp(T_start, T_end, s);
  const R = lerp(R_start, R_end, s);

  const ageYears = ageOffsetYears + postMainSequenceDurationYears(0.1) * t;
  return { L, T, R, ageYears, remnant: "wd", ejecta: 0, shellR: R, spinMul: 1.0 };
}

export function postMainSequenceState_0p5(f01, ageOffsetYears = 0) {
  const t = clamp01(f01);
  const dur = postMainSequenceDurationYears(0.5);

  const a = 0.62;
  const b = 0.78;

  const s1 = Math.pow(smooth01(clamp01(t / a)), 2.2);
  const s2 = smooth01(clamp01((t - a) / (b - a)));
  const s3 = smooth01(clamp01((t - b) / (1 - b)));

  // TRUE MS end (continuity)
  const msEnd = mainSequenceState(0.5, 1.0, 0);
  const L_ms_end = msEnd.L;
  const T_ms_end = msEnd.T;
  const R_ms_end = msEnd.R;

  // Gentle giant targets
  const L_rg = L_ms_end * 80;
  const T_rg = 3600;
  const R_rg = 28;

  // WD targets
  const L_wd_hot = 12;
  const T_wd_hot = 22000;
  const R_wd = 0.013;

  const L_wd_cool = 0.0012;
  const T_wd_cool = 8500;

  let L, T, R, ejecta, shellR, remnant;

  if (t <= a) {
    L = lerp(L_ms_end, L_rg, s1);
    T = lerp(T_ms_end, T_rg, s1);
    R = lerp(R_ms_end, R_rg, s1);
    ejecta = 0;
    shellR = R;
    remnant = "giant";
  } else if (t <= b) {
    L = lerp(L_rg, L_wd_hot, s2);
    T = lerp(T_rg, T_wd_hot, s2);
    R = lerp(R_rg, R_wd, s2);
    ejecta = 1.0 - s2;
    shellR = lerp(R_rg, R_rg * 2.0, s2);
    remnant = "giant";
  } else {
    L = lerp(L_wd_hot, L_wd_cool, s3);
    T = lerp(T_wd_hot, T_wd_cool, s3);
    R = R_wd;
    ejecta = 0;
    shellR = R;
    remnant = "wd";
  }

  const ageYears = ageOffsetYears + dur * t;
  return { L, T, R, ageYears, remnant, ejecta, shellR, spinMul: 1.0 };
}

export function postMainSequenceState_1p0(f01, ageOffsetYears = 0) {
  const t = clamp01(f01);
  const dur = postMainSequenceDurationYears(1.0);

  const a = 0.60;
  const b = 0.76;

  const s1 = Math.pow(smooth01(clamp01(t / a)), 2.4);
  const s2 = smooth01(clamp01((t - a) / (b - a)));
  const s3 = smooth01(clamp01((t - b) / (1 - b)));

  // TRUE MS end (continuity)
  const msEnd = mainSequenceState(1.0, 1.0, 0);
  const L_ms_end = msEnd.L;
  const T_ms_end = msEnd.T;
  const R_ms_end = msEnd.R;

  // Giant targets (smaller than your old 180)
  const L_rg = L_ms_end * 120;
  const T_rg = 3500;
  const R_rg = 55;

  // WD targets
  const L_wd_hot = 45;
  const T_wd_hot = 30000;
  const R_wd = 0.012;

  const L_wd_cool = 0.0009;
  const T_wd_cool = 8000;

  let L, T, R, ejecta, shellR, remnant;

  if (t <= a) {
    L = lerp(L_ms_end, L_rg, s1);
    T = lerp(T_ms_end, T_rg, s1);
    R = lerp(R_ms_end, R_rg, s1);
    ejecta = 0;
    shellR = R;
    remnant = "giant";
  } else if (t <= b) {
    L = lerp(L_rg, L_wd_hot, s2);
    T = lerp(T_rg, T_wd_hot, s2);
    R = lerp(R_rg, R_wd, s2);
    ejecta = 1.0 - s2;
    shellR = lerp(R_rg, R_rg * 2.2, s2);
    remnant = "giant";
  } else {
    L = lerp(L_wd_hot, L_wd_cool, s3);
    T = lerp(T_wd_hot, T_wd_cool, s3);
    R = R_wd;
    ejecta = 0;
    shellR = R;
    remnant = "wd";
  }

  const ageYears = ageOffsetYears + dur * t;
  return { L, T, R, ageYears, remnant, ejecta, shellR, spinMul: 1.0 };
}

// ---------- remnant types ----------
export function remnantTypeFromMass(M) {
  if (M >= 25) return "bh";
  if (M >= 8) return "ns";
  return "wd";
}

// ---------- intermediate (1.3–8): giant -> WD ----------
export function postMainSequenceState_intermediate(M, f01, ageOffsetYears = 0) {
  const t = clamp01(f01);
  const dur = postMainSequenceDurationYears(M);

  const a = 0.62;
  const b = 0.78;

  const s1 = Math.pow(smooth01(clamp01(t / a)), 2.2);
  const s2 = smooth01(clamp01((t - a) / (b - a)));
  const s3 = smooth01(clamp01((t - b) / (1 - b)));

  // TRUE MS end (continuity)
  const msEnd = mainSequenceState(M, 1.0, 0);
  const L_ms_end = msEnd.L;
  const T_ms_end = msEnd.T;
  const R_ms_end = msEnd.R;

  const giantBoost = Math.pow(M, 0.55);
  const R_rg = 35 * giantBoost;                 // 3 M☉ -> ~65-ish
  const T_rg = 3600;
  const L_rg = L_ms_end * (60 * giantBoost);

  const R_wd = 0.012;
  const T_wd_hot = 25000;
  const L_wd_hot = 35;

  const T_wd_cool = 9000;
  const L_wd_cool = 0.0012;

  let L, T, R, ejecta, shellR, remnant;

  if (t <= a) {
    L = lerp(L_ms_end, L_rg, s1);
    T = lerp(T_ms_end, T_rg, s1);
    R = lerp(R_ms_end, R_rg, s1);
    ejecta = 0;
    shellR = R;
    remnant = "giant";
  } else if (t <= b) {
    L = lerp(L_rg, L_wd_hot, s2);
    T = lerp(T_rg, T_wd_hot, s2);
    R = lerp(R_rg, R_wd, s2);
    ejecta = 1.0 - s2;
    shellR = lerp(R_rg, R_rg * 2.2, s2);
    remnant = "giant";
  } else {
    L = lerp(L_wd_hot, L_wd_cool, s3);
    T = lerp(T_wd_hot, T_wd_cool, s3);
    R = R_wd;
    ejecta = 0;
    shellR = R;
    remnant = "wd";
  }

  const ageYears = ageOffsetYears + dur * t;
  return { L, T, R, ageYears, remnant, ejecta, shellR, spinMul: 1.0 };
}

// ---------- massive (>=8): supergiant -> collapse -> NS/BH ----------
// We keep it visual/educational: expand to supergiant first, then collapse.
export function postMainSequenceState_massive(M, f01, ageOffsetYears = 0) {
  const t = clamp01(f01);
  const dur = postMainSequenceDurationYears(M);

  // phase splits
  const a = 0.55; // supergiant expansion
  const b = 0.72; // collapse + ejecta
  const s1 = Math.pow(smooth01(clamp01(t / a)), 1.8);
  const s2 = smooth01(clamp01((t - a) / (b - a)));
  const s3 = smooth01(clamp01((t - b) / (1 - b)));

  // TRUE MS end (continuity)
  const msEnd = mainSequenceState(M, 1.0, 0);
  const L_ms_end = msEnd.L;
  const T_ms_end = msEnd.T;
  const R_ms_end = msEnd.R;

  // supergiant targets (bounded so it doesn't go insane)
  const boost = Math.pow(M / 10.0, 0.35);
  const R_sg = clamp(120 * boost, 90, 260);     // 10 -> ~120, 100 -> capped
  const T_sg = 4200;                            // cool surface
  const L_sg = L_ms_end * clamp(6 * boost, 4, 18);

  const type = remnantTypeFromMass(M);

  // Remnant targets
  const R_ns = 0.06;
  const T_ns = 7.0e5;
  const L_ns = 2e2;

  const R_bh = 0.08; // purely visual; NOT physical Schwarzschild radius
  const T_bh = 0.0;
  const L_bh = 0.0;

  let L, T, R, ejecta, shellR, remnant, spinMul;

  if (t <= a) {
    // MS end -> supergiant
    L = lerp(L_ms_end, L_sg, s1);
    T = lerp(T_ms_end, T_sg, s1);
    R = lerp(R_ms_end, R_sg, s1);
    ejecta = 0.0;
    shellR = R;
    remnant = "giant"; // label it as giant/supergiant region visually
    spinMul = 0.8;
  } else if (t <= b) {
    // supergiant -> collapse (bright ejection)
    if (type === "ns") {
      L = lerp(L_sg, L_ns, s2);
      T = lerp(T_sg, T_ns, s2);
      R = lerp(R_sg, R_ns, s2);
      remnant = "ns";
      spinMul = 18.0; // <- visibly faster
    } else {
      L = lerp(L_sg, L_bh, s2);
      T = lerp(T_sg, T_bh, s2);
      R = lerp(R_sg, R_bh, s2);
      remnant = "bh";
      spinMul = 2.0;
    }

    ejecta = 1.0 - s2;
    shellR = lerp(R_sg, R_sg * 2.8, s2);
  } else {
    // Remnant settling/cooling
    if (type === "ns") {
      L = lerp(L_ns, L_ns * 0.25, s3);
      T = lerp(T_ns, T_ns * 0.7, s3);
      R = R_ns;
      remnant = "ns";
      spinMul = 18.0;
    } else {
      L = 0.0;
      T = 0.0;
      R = R_bh;
      remnant = "bh";
      spinMul = 2.0;
    }
    ejecta = 0.0;
    shellR = R;
  }

  const ageYears = ageOffsetYears + dur * t;
  return { L, T, R, ageYears, remnant, ejecta, shellR, spinMul };
}

// ---------- router ----------
export function postMainSequenceState(M, f01, ageOffsetYears = 0) {
  if (M <= 0.2) return postMainSequenceState_0p1(f01, ageOffsetYears);
  if (M <= 0.7) return postMainSequenceState_0p5(f01, ageOffsetYears);
  if (M <= 1.3) return postMainSequenceState_1p0(f01, ageOffsetYears);

  if (M < 8.0) return postMainSequenceState_intermediate(M, f01, ageOffsetYears);
  return postMainSequenceState_massive(M, f01, ageOffsetYears);
}