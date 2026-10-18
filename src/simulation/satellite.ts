import { json2satrec, propagate } from "satellite.js";

import type { SatelliteElementSet, Vector3 } from "../domain/types";
import type { ScientificState } from "./ephemeris";
import { utcMilliseconds } from "./time";

const MILLISECONDS_PER_DAY = 86_400_000;

export const DEFAULT_SATELLITE_STALE_AFTER_DAYS = 2;

interface SatelliteLibraryState {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
}

export type SatellitePropagationAdapter = (
  elements: SatelliteElementSet,
  at: Date,
) => SatelliteLibraryState | null;

export interface SatellitePropagationOptions {
  staleAfterDays?: number;
  propagate?: SatellitePropagationAdapter;
}

interface PropagatedSatelliteState {
  frame: "TEME";
  state: ScientificState;
  elementAgeDays: number;
}

export type SatellitePropagationResult =
  | ({ status: "READY" } & PropagatedSatelliteState)
  | ({ status: "STALE" } & PropagatedSatelliteState)
  | { status: "INVALID_TIME" }
  | { status: "OUT_OF_RANGE"; startUtcMs: number; endUtcMs: number }
  | { status: "PROPAGATION_FAILED" }
  | { status: "INVALID_STATE" };

export function propagateSatellite(
  elements: SatelliteElementSet,
  timeUtcMs: number,
  options: SatellitePropagationOptions = {},
): SatellitePropagationResult {
  if (!Number.isFinite(timeUtcMs)) {
    return { status: "INVALID_TIME" };
  }

  const startUtcMs = utcMilliseconds(elements.validity.startUtc);
  const endUtcMs = utcMilliseconds(elements.validity.endUtc);
  if (timeUtcMs < startUtcMs || timeUtcMs > endUtcMs) {
    return { status: "OUT_OF_RANGE", startUtcMs, endUtcMs };
  }

  const propagateState = options.propagate ?? propagateWithSatelliteJs;
  let propagated: SatelliteLibraryState | null;
  try {
    propagated = propagateState(elements, new Date(timeUtcMs));
  } catch {
    return { status: "PROPAGATION_FAILED" };
  }
  if (propagated === null) {
    return { status: "PROPAGATION_FAILED" };
  }

  const state: ScientificState = {
    positionKm: toVector(propagated.position),
    velocityKmPerSecond: toVector(propagated.velocity),
  };
  if (!allFinite(state)) {
    return { status: "INVALID_STATE" };
  }

  const elementAgeDays =
    (timeUtcMs - utcMilliseconds(elements.epochUtc)) / MILLISECONDS_PER_DAY;
  const staleAfterDays =
    options.staleAfterDays ?? DEFAULT_SATELLITE_STALE_AFTER_DAYS;
  const status = Math.abs(elementAgeDays) > staleAfterDays ? "STALE" : "READY";

  return { status, frame: "TEME", state, elementAgeDays };
}

function propagateWithSatelliteJs(
  elements: SatelliteElementSet,
  at: Date,
): SatelliteLibraryState | null {
  const satelliteRecord = json2satrec({
    OBJECT_NAME: elements.objectId,
    OBJECT_ID: elements.objectId,
    CENTER_NAME: "EARTH",
    REF_FRAME: "TEME",
    TIME_SYSTEM: "UTC",
    MEAN_ELEMENT_THEORY: "SGP4",
    EPOCH: elements.epochUtc,
    MEAN_MOTION: elements.meanMotionRevsPerDay,
    ECCENTRICITY: elements.eccentricity,
    INCLINATION: elements.inclinationDeg,
    RA_OF_ASC_NODE: elements.rightAscensionAscendingNodeDeg,
    ARG_OF_PERICENTER: elements.argumentOfPericenterDeg,
    MEAN_ANOMALY: elements.meanAnomalyDeg,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: "U",
    NORAD_CAT_ID: elements.noradCatalogId,
    ELEMENT_SET_NO: elements.elementSetNumber,
    REV_AT_EPOCH: 0,
    BSTAR: elements.bstar,
    MEAN_MOTION_DOT: 0,
    MEAN_MOTION_DDOT: 0,
  });

  return propagate(satelliteRecord, at) as SatelliteLibraryState | null;
}

function toVector(vector: { x: number; y: number; z: number }): Vector3 {
  return [vector.x, vector.y, vector.z];
}

function allFinite(state: ScientificState): boolean {
  return (
    state.positionKm.every(Number.isFinite) &&
    state.velocityKmPerSecond.every(Number.isFinite)
  );
}
