import { describe, expect, it, vi } from "vitest";

import type { Vector3 } from "../domain/types";
import { PROTOCOL_VERSION } from "../worker/protocol";
import { postWorkerResponse } from "../worker/simulation.worker";
import {
  fromRenderPosition,
  renderRadius,
  toRenderPosition,
  toRenderPositionBuffer,
} from "./renderTransform";

describe("camera-relative render transforms", () => {
  it("preserves Float64 scientific inputs and emits a finite Float32 buffer", () => {
    const positions: Vector3[] = [
      [149_597_870.7, 10_000, -25_000],
      [149_599_870.7, 12_000, -20_000],
    ];
    const before = structuredClone(positions);
    const buffer = toRenderPositionBuffer(positions, {
      cameraOriginKm: [149_597_870.7, 10_000, -25_000],
      scaleMode: "RELATIVE",
      relativeKmPerUnit: 1_000,
    });

    expect(positions).toEqual(before);
    expect(buffer).toBeInstanceOf(Float32Array);
    expect(buffer.buffer).toBeInstanceOf(ArrayBuffer);
    expect(Array.from(buffer).every(Number.isFinite)).toBe(true);
    expect(Array.from(buffer)).toEqual([0, 0, 0, 2, 2, 5]);
  });

  it("hands the transformed buffer to the worker transfer list", () => {
    const positions = toRenderPositionBuffer([[1_000, 2_000, 3_000]], {
      cameraOriginKm: [0, 0, 0],
      scaleMode: "RELATIVE",
      relativeKmPerUnit: 1_000,
    });
    const response = {
      protocolVersion: PROTOCOL_VERSION,
      type: "positions" as const,
      generation: 3,
      objectIds: ["earth"],
      positions,
    };
    const postMessage = vi.fn();

    postWorkerResponse({ postMessage }, response);

    expect(postMessage).toHaveBeenCalledWith(response, [positions.buffer]);
  });

  it("uses one physical ratio for relative positions and radii", () => {
    const context = {
      cameraOriginKm: [0, 0, 0] as Vector3,
      scaleMode: "RELATIVE" as const,
      relativeKmPerUnit: 500,
    };

    expect(toRenderPosition([1_000, 0, 0], context)).toEqual([2, 0, 0]);
    expect(renderRadius(1_000, context)).toBe(2);
  });

  it("compresses illustrative distance without changing scientific coordinates", () => {
    const position: Vector3 = [1_000_000, -2_000_000, 500_000];
    const before = [...position];
    const relative = toRenderPosition(position, {
      cameraOriginKm: [0, 0, 0],
      scaleMode: "RELATIVE",
      relativeKmPerUnit: 1_000,
    });
    const illustrative = toRenderPosition(position, {
      cameraOriginKm: [0, 0, 0],
      scaleMode: "ILLUSTRATIVE",
      illustrativeKmPerUnit: 100_000,
    });

    expect(position).toEqual(before);
    expect(illustrative).not.toEqual(relative);
    expect(illustrative.every(Number.isFinite)).toBe(true);
    expect(Math.hypot(...illustrative)).toBeLessThan(Math.hypot(...relative));
  });

  it.each(["RELATIVE", "ILLUSTRATIVE"] as const)(
    "round-trips %s positions in Float64 space",
    (scaleMode) => {
      const position: Vector3 = [1_000_000, -2_000_000, 500_000];
      const context = {
        cameraOriginKm: [400_000, -250_000, 100_000] as Vector3,
        scaleMode,
        relativeKmPerUnit: 1_000,
        illustrativeKmPerUnit: 100_000,
      };

      const roundTrip = fromRenderPosition(
        toRenderPosition(position, context),
        context,
      );

      for (let axis = 0; axis < 3; axis += 1) {
        expect(Math.abs(roundTrip[axis] - position[axis])).toBeLessThan(1e-8);
      }
    },
  );

  it("rejects non-finite coordinates and invalid scale ratios", () => {
    expect(() =>
      toRenderPosition([Number.NaN, 0, 0], {
        cameraOriginKm: [0, 0, 0],
        scaleMode: "RELATIVE",
      }),
    ).toThrow("finite");
    expect(() =>
      toRenderPosition([0, 0, 0], {
        cameraOriginKm: [0, 0, 0],
        scaleMode: "RELATIVE",
        relativeKmPerUnit: 0,
      }),
    ).toThrow("positive");
  });
});
