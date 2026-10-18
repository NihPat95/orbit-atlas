import type { Vector3 } from "../domain/types";
import type { ScientificState } from "./ephemeris";

type ReferenceFrame = "EARTH_CENTERED" | "SUN_CENTERED";
type Matrix3 = [Vector3, Vector3, Vector3];

const MILLISECONDS_PER_DAY = 86_400_000;
const JULIAN_DATE_UNIX_EPOCH = 2_440_587.5;
const JULIAN_DATE_J2000 = 2_451_545;
const DAYS_PER_JULIAN_CENTURY = 36_525;
const ARCSECONDS_TO_RADIANS = Math.PI / (180 * 3_600);
const DEGREES_TO_RADIANS = Math.PI / 180;

// Fixed UTC history keeps this educational transform deterministic without live EOP data.
const LEAP_SECOND_EFFECTIVE_DATES: readonly [number, number][] = [
  [Date.UTC(1972, 0, 1), 10],
  [Date.UTC(1972, 6, 1), 11],
  [Date.UTC(1973, 0, 1), 12],
  [Date.UTC(1974, 0, 1), 13],
  [Date.UTC(1975, 0, 1), 14],
  [Date.UTC(1976, 0, 1), 15],
  [Date.UTC(1977, 0, 1), 16],
  [Date.UTC(1978, 0, 1), 17],
  [Date.UTC(1979, 0, 1), 18],
  [Date.UTC(1980, 0, 1), 19],
  [Date.UTC(1981, 6, 1), 20],
  [Date.UTC(1982, 6, 1), 21],
  [Date.UTC(1983, 6, 1), 22],
  [Date.UTC(1985, 6, 1), 23],
  [Date.UTC(1988, 0, 1), 24],
  [Date.UTC(1990, 0, 1), 25],
  [Date.UTC(1991, 0, 1), 26],
  [Date.UTC(1992, 6, 1), 27],
  [Date.UTC(1993, 6, 1), 28],
  [Date.UTC(1994, 6, 1), 29],
  [Date.UTC(1996, 0, 1), 30],
  [Date.UTC(1997, 6, 1), 31],
  [Date.UTC(1999, 0, 1), 32],
  [Date.UTC(2006, 0, 1), 33],
  [Date.UTC(2009, 0, 1), 34],
  [Date.UTC(2012, 6, 1), 35],
  [Date.UTC(2015, 6, 1), 36],
  [Date.UTC(2017, 0, 1), 37],
];

export function temeToJ2000(
  state: ScientificState,
  timeUtcMs: number,
): ScientificState {
  if (!Number.isFinite(timeUtcMs)) {
    throw new Error("TEME conversion time must be finite");
  }
  const matrix = temeToJ2000Matrix(timeUtcMs);
  return {
    positionKm: multiplyMatrixVector(matrix, state.positionKm),
    velocityKmPerSecond: multiplyMatrixVector(
      matrix,
      state.velocityKmPerSecond,
    ),
  };
}

export function satelliteTemeToSunCentered(
  satelliteTeme: ScientificState,
  earthSunCentered: ScientificState,
  timeUtcMs: number,
): ScientificState {
  const earthCenteredJ2000 = temeToJ2000(satelliteTeme, timeUtcMs);
  return addStates(earthCenteredJ2000, earthSunCentered);
}

export function convertReferenceFrame(
  state: ScientificState,
  earthSunCentered: ScientificState,
  from: ReferenceFrame,
  to: ReferenceFrame,
): ScientificState {
  if (from === to) {
    return cloneState(state);
  }
  return from === "SUN_CENTERED"
    ? subtractStates(state, earthSunCentered)
    : addStates(state, earthSunCentered);
}

function temeToJ2000Matrix(timeUtcMs: number): Matrix3 {
  const ttOffsetSeconds = terrestrialTimeOffsetSeconds(timeUtcMs);
  const julianDateTt =
    timeUtcMs / MILLISECONDS_PER_DAY +
    JULIAN_DATE_UNIX_EPOCH +
    ttOffsetSeconds / 86_400;
  const centuries =
    (julianDateTt - JULIAN_DATE_J2000) / DAYS_PER_JULIAN_CENTURY;

  const centuries2 = centuries * centuries;
  const centuries3 = centuries2 * centuries;
  const zeta =
    (2306.2181 * centuries + 0.30188 * centuries2 + 0.017998 * centuries3) *
    ARCSECONDS_TO_RADIANS;
  const theta =
    (2004.3109 * centuries - 0.42665 * centuries2 - 0.041833 * centuries3) *
    ARCSECONDS_TO_RADIANS;
  const z =
    (2306.2181 * centuries + 1.09468 * centuries2 + 0.018203 * centuries3) *
    ARCSECONDS_TO_RADIANS;

  const meanObliquity =
    (84_381.448 -
      46.815 * centuries -
      0.00059 * centuries2 +
      0.001813 * centuries3) *
    ARCSECONDS_TO_RADIANS;
  const omega =
    normalizeDegrees(
      125.04452 - 1934.136261 * centuries + 0.002071 * centuries2,
    ) * DEGREES_TO_RADIANS;
  const meanSolarLongitude =
    normalizeDegrees(280.4665 + 36_000.7698 * centuries) * DEGREES_TO_RADIANS;
  const meanLunarLongitude =
    normalizeDegrees(218.3165 + 481_267.8813 * centuries) * DEGREES_TO_RADIANS;
  const nutationLongitude =
    (-17.2 * Math.sin(omega) -
      1.32 * Math.sin(2 * meanSolarLongitude) -
      0.23 * Math.sin(2 * meanLunarLongitude) +
      0.21 * Math.sin(2 * omega)) *
    ARCSECONDS_TO_RADIANS;
  const nutationObliquity =
    (9.2 * Math.cos(omega) +
      0.57 * Math.cos(2 * meanSolarLongitude) +
      0.1 * Math.cos(2 * meanLunarLongitude) -
      0.09 * Math.cos(2 * omega)) *
    ARCSECONDS_TO_RADIANS;
  const trueObliquity = meanObliquity + nutationObliquity;
  const equationOfEquinoxes = nutationLongitude * Math.cos(meanObliquity);

  const precessionToJ2000 = multiplyMatrices(
    multiplyMatrices(rotation3(zeta), rotation2(-theta)),
    rotation3(z),
  );
  const trueToMean = multiplyMatrices(
    multiplyMatrices(rotation1(-meanObliquity), rotation3(nutationLongitude)),
    rotation1(trueObliquity),
  );
  return multiplyMatrices(
    multiplyMatrices(precessionToJ2000, trueToMean),
    rotation3(-equationOfEquinoxes),
  );
}

function terrestrialTimeOffsetSeconds(timeUtcMs: number): number {
  let taiMinusUtc = 0;
  for (const [effectiveUtcMs, leapSeconds] of LEAP_SECOND_EFFECTIVE_DATES) {
    if (timeUtcMs < effectiveUtcMs) {
      break;
    }
    taiMinusUtc = leapSeconds;
  }
  return taiMinusUtc + 32.184;
}

function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

function rotation1(angle: number): Matrix3 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [
    [1, 0, 0],
    [0, cosine, sine],
    [0, -sine, cosine],
  ];
}

function rotation2(angle: number): Matrix3 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [
    [cosine, 0, -sine],
    [0, 1, 0],
    [sine, 0, cosine],
  ];
}

function rotation3(angle: number): Matrix3 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [
    [cosine, sine, 0],
    [-sine, cosine, 0],
    [0, 0, 1],
  ];
}

function multiplyMatrices(left: Matrix3, right: Matrix3): Matrix3 {
  return left.map((row) =>
    [0, 1, 2].map((column) =>
      row.reduce(
        (sum, coordinate, index) => sum + coordinate * right[index][column],
        0,
      ),
    ),
  ) as Matrix3;
}

function multiplyMatrixVector(matrix: Matrix3, vector: Vector3): Vector3 {
  return matrix.map((row) =>
    row.reduce((sum, coordinate, index) => sum + coordinate * vector[index], 0),
  ) as Vector3;
}

function addStates(
  left: ScientificState,
  right: ScientificState,
): ScientificState {
  return {
    positionKm: addVectors(left.positionKm, right.positionKm),
    velocityKmPerSecond: addVectors(
      left.velocityKmPerSecond,
      right.velocityKmPerSecond,
    ),
  };
}

function subtractStates(
  left: ScientificState,
  right: ScientificState,
): ScientificState {
  return {
    positionKm: subtractVectors(left.positionKm, right.positionKm),
    velocityKmPerSecond: subtractVectors(
      left.velocityKmPerSecond,
      right.velocityKmPerSecond,
    ),
  };
}

function addVectors(left: Vector3, right: Vector3): Vector3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function subtractVectors(left: Vector3, right: Vector3): Vector3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function cloneState(state: ScientificState): ScientificState {
  return {
    positionKm: [...state.positionKm],
    velocityKmPerSecond: [...state.velocityKmPerSecond],
  };
}
