// models.js
// Pure math only (no DOM, no THREE)

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
  const T = T0 * (1.0 - 0.55 * f01);

  const R0 = radiusFromMass(M);
  const R = R0 * (1.0 + 0.30 * f01);

  const ageYears = mainSequenceLifetimeYears(M) * f01;
  return { L, T, R, ageYears };
}

export function absMagnitudeFromLuminosity(L) {
  return 4.83 - 2.5 * Math.log10(Math.max(L, 1e-9));
}
