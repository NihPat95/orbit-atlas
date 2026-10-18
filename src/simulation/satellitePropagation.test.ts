import { describe, expect, it } from "vitest";

import {
  valladoElementSet,
  valladoSatelliteVectors,
} from "../test/satelliteFixtures";
import { propagateSatellite } from "./satellite";
import { utcMilliseconds } from "./time";

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

describe("propagateSatellite", () => {
  it.each(valladoSatelliteVectors)(
    "matches the Vallado SGP4 verification vector $name",
    ({ atUtc, positionKm, velocityKmPerSecond, tolerance }) => {
      const result = propagateSatellite(
        valladoElementSet,
        utcMilliseconds(atUtc),
      );

      expect(result.status).toBe("READY");
      if (result.status !== "READY") {
        throw new Error("Expected a propagated state");
      }
      expect(result.frame).toBe("TEME");
      expectVectorWithin(
        result.state.positionKm,
        positionKm,
        tolerance.positionKm,
      );
      expectVectorWithin(
        result.state.velocityKmPerSecond,
        velocityKmPerSecond,
        tolerance.velocityKmPerSecond,
      );
    },
  );

  it("returns a propagated state with an explicit stale status and element age", () => {
    const result = propagateSatellite(
      valladoElementSet,
      utcMilliseconds("2000-06-30T18:50:19.733Z"),
      { staleAfterDays: 2 },
    );

    expect(result.status).toBe("STALE");
    if (result.status !== "STALE") {
      throw new Error("Expected a stale propagated state");
    }
    expect(result.elementAgeDays).toBe(3);
    expect(result.state.positionKm.every(Number.isFinite)).toBe(true);
    expect(result.state.velocityKmPerSecond.every(Number.isFinite)).toBe(true);
  });

  it("rejects invalid and out-of-range times before propagation", () => {
    expect(propagateSatellite(valladoElementSet, Number.NaN)).toEqual({
      status: "INVALID_TIME",
    });
    expect(
      propagateSatellite(
        valladoElementSet,
        utcMilliseconds("2000-07-11T00:00:00.000Z"),
      ),
    ).toEqual({
      status: "OUT_OF_RANGE",
      startUtcMs: utcMilliseconds(valladoElementSet.validity.startUtc),
      endUtcMs: utcMilliseconds(valladoElementSet.validity.endUtc),
    });
  });

  it("reports propagation failures and non-finite library output", () => {
    const atEpoch = utcMilliseconds(valladoElementSet.epochUtc);

    expect(
      propagateSatellite(valladoElementSet, atEpoch, {
        propagate: () => null,
      }),
    ).toEqual({ status: "PROPAGATION_FAILED" });
    expect(
      propagateSatellite(valladoElementSet, atEpoch, {
        propagate: () => ({
          position: { x: Number.NaN, y: 0, z: 0 },
          velocity: { x: 0, y: 0, z: 0 },
        }),
      }),
    ).toEqual({ status: "INVALID_STATE" });
  });
});
