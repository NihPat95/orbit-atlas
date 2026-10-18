import { describe, expect, it } from "vitest";

import { heldOutEphemerisFixtures } from "../test/ephemerisFixtures";
import { interpolateEphemeris } from "./ephemeris";
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

describe("interpolateEphemeris", () => {
  it("returns exact finite endpoint states", () => {
    const fixture = heldOutEphemerisFixtures[0];

    for (const sample of fixture.series.samples) {
      const result = interpolateEphemeris(
        fixture.series,
        utcMilliseconds(sample.epochUtc),
      );

      expect(result.status).toBe("READY");
      if (result.status !== "READY") {
        throw new Error("Expected an interpolated state");
      }
      expect(result.state).toEqual({
        positionKm: sample.positionKm,
        velocityKmPerSecond: sample.velocityKmPerSecond,
      });
      expect(result.state.positionKm.every(Number.isFinite)).toBe(true);
      expect(result.state.velocityKmPerSecond.every(Number.isFinite)).toBe(
        true,
      );
    }
  });

  it.each(heldOutEphemerisFixtures)(
    "matches the held-out Horizons vector for $name",
    ({ series, heldOut }) => {
      const result = interpolateEphemeris(
        series,
        utcMilliseconds(heldOut.epochUtc),
      );

      expect(result.status).toBe("READY");
      if (result.status !== "READY") {
        throw new Error("Expected an interpolated state");
      }
      expectVectorWithin(
        result.state.positionKm,
        heldOut.positionKm,
        heldOut.tolerance.positionKm,
      );
      expectVectorWithin(
        result.state.velocityKmPerSecond,
        heldOut.velocityKmPerSecond,
        heldOut.tolerance.velocityKmPerSecond,
      );
    },
  );

  it("returns explicit missing, invalid-time, and out-of-range statuses", () => {
    const fixture = heldOutEphemerisFixtures[0];

    expect(interpolateEphemeris(undefined, Date.UTC(2000, 0, 1))).toEqual({
      status: "MISSING_SEGMENT",
    });
    expect(interpolateEphemeris(fixture.series, Number.NaN)).toEqual({
      status: "INVALID_TIME",
    });
    expect(
      interpolateEphemeris(
        fixture.series,
        utcMilliseconds("1899-12-31T23:59:59.999Z"),
      ),
    ).toEqual({
      status: "OUT_OF_RANGE",
      startUtcMs: utcMilliseconds(fixture.series.startUtc),
      endUtcMs: utcMilliseconds(fixture.series.endUtc),
    });
  });
});

describe("utcMilliseconds", () => {
  it("accepts explicit UTC timestamps and rejects ambiguous or invalid input", () => {
    expect(utcMilliseconds("2000-01-01T12:00:00.000Z")).toBe(946_728_000_000);
    expect(() => utcMilliseconds("2000-01-01T12:00:00")).toThrow(
      "explicit UTC offset",
    );
    expect(() => utcMilliseconds("not-a-date")).toThrow("Invalid UTC time");
  });
});
