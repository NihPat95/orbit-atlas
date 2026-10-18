import { describe, expect, it } from "vitest";

import type { ScientificState } from "./ephemeris";
import {
  convertReferenceFrame,
  satelliteTemeToSunCentered,
  temeToJ2000,
} from "./frames";
import { utcMilliseconds } from "./time";

const earthState: ScientificState = {
  positionKm: [149_000_000, -2_000_000, 500_000],
  velocityKmPerSecond: [0.2, 29.7, -0.1],
};

const satelliteTeme: ScientificState = {
  positionKm: [-9060.47373569, 4658.70952502, 813.68673153],
  velocityKmPerSecond: [-2.232832783, -4.11045349, -3.157345433],
};

const valladoDateUtcMs = utcMilliseconds("2000-06-30T18:50:19.733Z");

function expectVectorWithin(
  actual: readonly number[],
  expected: readonly number[],
  tolerance: number,
): void {
  for (let axis = 0; axis < 3; axis += 1) {
    expect(Math.abs(actual[axis] - expected[axis])).toBeLessThanOrEqual(
      tolerance,
    );
  }
}

describe("TEME conversion", () => {
  it("matches Vallado's four-term IAU-76/FK5 J2000 fixture", () => {
    const converted = temeToJ2000(satelliteTeme, valladoDateUtcMs);

    expectVectorWithin(
      converted.positionKm,
      [-9059.9413786, 4659.6972, 813.9588875],
      0.05,
    );
    expectVectorWithin(
      converted.velocityKmPerSecond,
      [-2.233348094, -4.110136162, -3.157394074],
      0.00005,
    );
  });

  it("adds the converted Earth-centered state to the common Sun-centered state", () => {
    const converted = temeToJ2000(satelliteTeme, valladoDateUtcMs);
    const common = satelliteTemeToSunCentered(
      satelliteTeme,
      earthState,
      valladoDateUtcMs,
    );

    expect(common.positionKm).toEqual(
      converted.positionKm.map(
        (coordinate, axis) => coordinate + earthState.positionKm[axis],
      ),
    );
    expect(common.velocityKmPerSecond).toEqual(
      converted.velocityKmPerSecond.map(
        (coordinate, axis) => coordinate + earthState.velocityKmPerSecond[axis],
      ),
    );
  });
});

describe("reference-frame origins", () => {
  it("round-trips between Sun- and Earth-centered origins without mutating input", () => {
    const original: ScientificState = {
      positionKm: [150_000_000, 25_000, -4_000],
      velocityKmPerSecond: [-0.4, 35, 2],
    };
    const before = structuredClone(original);

    const earthCentered = convertReferenceFrame(
      original,
      earthState,
      "SUN_CENTERED",
      "EARTH_CENTERED",
    );
    const roundTrip = convertReferenceFrame(
      earthCentered,
      earthState,
      "EARTH_CENTERED",
      "SUN_CENTERED",
    );

    expect(original).toEqual(before);
    expectVectorWithin(roundTrip.positionKm, original.positionKm, 1e-9);
    expectVectorWithin(
      roundTrip.velocityKmPerSecond,
      original.velocityKmPerSecond,
      1e-12,
    );
    expect(earthCentered.positionKm).toEqual([1_000_000, 2_025_000, -504_000]);
    expectVectorWithin(
      earthCentered.velocityKmPerSecond,
      [-0.6, 5.3, 2.1],
      1e-12,
    );
  });
});
