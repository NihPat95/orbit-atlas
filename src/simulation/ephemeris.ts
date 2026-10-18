import type { EphemerisSeries, Vector3 } from "../domain/types";
import { utcMilliseconds } from "./time";

export interface ScientificState {
  positionKm: Vector3;
  velocityKmPerSecond: Vector3;
}

export type EphemerisInterpolationResult =
  | { status: "READY"; state: ScientificState }
  | { status: "MISSING_SEGMENT" }
  | { status: "INVALID_TIME" }
  | { status: "INVALID_STATE" }
  | { status: "OUT_OF_RANGE"; startUtcMs: number; endUtcMs: number };

export function interpolateEphemeris(
  series: EphemerisSeries | undefined,
  timeUtcMs: number,
): EphemerisInterpolationResult {
  if (series === undefined) {
    return { status: "MISSING_SEGMENT" };
  }
  if (!Number.isFinite(timeUtcMs)) {
    return { status: "INVALID_TIME" };
  }

  const startUtcMs = utcMilliseconds(series.startUtc);
  const endUtcMs = utcMilliseconds(series.endUtc);
  const firstSampleMs = utcMilliseconds(series.samples[0].epochUtc);
  const lastSampleMs = utcMilliseconds(
    series.samples[series.samples.length - 1].epochUtc,
  );
  if (
    timeUtcMs < startUtcMs ||
    timeUtcMs > endUtcMs ||
    timeUtcMs < firstSampleMs ||
    timeUtcMs > lastSampleMs
  ) {
    return { status: "OUT_OF_RANGE", startUtcMs, endUtcMs };
  }

  const upperIndex = findUpperSampleIndex(series, timeUtcMs);
  if (upperIndex === 0) {
    return readyCopy(series.samples[0]);
  }

  const upper = series.samples[upperIndex];
  const upperUtcMs = utcMilliseconds(upper.epochUtc);
  if (timeUtcMs === upperUtcMs) {
    return readyCopy(upper);
  }

  const lower = series.samples[upperIndex - 1];
  const lowerUtcMs = utcMilliseconds(lower.epochUtc);
  const durationSeconds = (upperUtcMs - lowerUtcMs) / 1_000;
  const normalizedTime = (timeUtcMs - lowerUtcMs) / 1_000 / durationSeconds;
  const state = hermiteState(
    lower.positionKm,
    lower.velocityKmPerSecond,
    upper.positionKm,
    upper.velocityKmPerSecond,
    durationSeconds,
    normalizedTime,
  );

  return allFinite(state)
    ? { status: "READY", state }
    : { status: "INVALID_STATE" };
}

function findUpperSampleIndex(
  series: EphemerisSeries,
  timeUtcMs: number,
): number {
  let low = 0;
  let high = series.samples.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (utcMilliseconds(series.samples[middle].epochUtc) < timeUtcMs) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
}

function readyCopy(
  sample: EphemerisSeries["samples"][number],
): EphemerisInterpolationResult {
  const state: ScientificState = {
    positionKm: [...sample.positionKm],
    velocityKmPerSecond: [...sample.velocityKmPerSecond],
  };
  return allFinite(state)
    ? { status: "READY", state }
    : { status: "INVALID_STATE" };
}

function hermiteState(
  position0: Vector3,
  velocity0: Vector3,
  position1: Vector3,
  velocity1: Vector3,
  durationSeconds: number,
  time: number,
): ScientificState {
  const time2 = time * time;
  const time3 = time2 * time;
  const positionBasis0 = 2 * time3 - 3 * time2 + 1;
  const velocityBasis0 = time3 - 2 * time2 + time;
  const positionBasis1 = -2 * time3 + 3 * time2;
  const velocityBasis1 = time3 - time2;
  const positionDerivative0 = (6 * time2 - 6 * time) / durationSeconds;
  const velocityDerivative0 = 3 * time2 - 4 * time + 1;
  const positionDerivative1 = (-6 * time2 + 6 * time) / durationSeconds;
  const velocityDerivative1 = 3 * time2 - 2 * time;

  const positionKm = [0, 1, 2].map(
    (axis) =>
      positionBasis0 * position0[axis] +
      velocityBasis0 * durationSeconds * velocity0[axis] +
      positionBasis1 * position1[axis] +
      velocityBasis1 * durationSeconds * velocity1[axis],
  ) as Vector3;
  const velocityKmPerSecond = [0, 1, 2].map(
    (axis) =>
      positionDerivative0 * position0[axis] +
      velocityDerivative0 * velocity0[axis] +
      positionDerivative1 * position1[axis] +
      velocityDerivative1 * velocity1[axis],
  ) as Vector3;

  return { positionKm, velocityKmPerSecond };
}

function allFinite(state: ScientificState): boolean {
  return (
    state.positionKm.every(Number.isFinite) &&
    state.velocityKmPerSecond.every(Number.isFinite)
  );
}
