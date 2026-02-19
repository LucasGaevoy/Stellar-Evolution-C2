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

export function mainSequenceState(M, f01) {
  const L0 = luminosityFromMass(M);
  const L = L0 * (1.0 + 0.40 * f01);

  const T0 = baseTeffK(M);
  const T = T0 * (1.0 - 0.55 * f01); // keep your teaching exaggeration if you want

  const R0 = radiusFromMass(M);
  const R = R0 * (1.0 + 0.35 * f01); // keep your teaching exaggeration if you want

  const ageYears = mainSequenceLifetimeYears(M) * f01;
  return { L, T, R, ageYears };
}

export function absMagnitudeFromLuminosity(L) {
  return 4.83 - 2.5 * Math.log10(Math.max(L, 1e-9));
}

// ---------------- PROTOSTAR (Pre-MS) ----------------

// Teaching-friendly pre-MS duration: low mass takes longer, high mass is quick
export function protostarDurationYears(M) {
  // ~50 Myr at 1 Msun, ~300 Myr at 0.1 Msun, ~2–3 Myr at 10 Msun
  return 5e7 * Math.pow(M, -1.4);
}

// Protostar evolves toward ZAMS (main sequence f=0 baseline)
export function protostarState(M, f01) {
  const zams = mainSequenceState(M, 0); // anchor point at MS start

  // Start big/cool, contract and heat up toward ZAMS
  const Rmult_start = 3.2;                 // bigger = more dramatic contraction
  const Rmult = Rmult_start - (Rmult_start - 1.0) * f01;
  const R = zams.R * Rmult;

  const Tmult_start = 0.55;                // smaller = redder at start
  const Tmult = Tmult_start + (1.0 - Tmult_start) * f01;
  const T = zams.T * Tmult;

  // Use Stefan–Boltzmann scaling relative to ZAMS for a consistent L
  const L =
    zams.L *
    Math.pow(R / zams.R, 2) *
    Math.pow(T / zams.T, 4);

  const ageYears = protostarDurationYears(M) * f01;

  return { L, T, R, ageYears };
}