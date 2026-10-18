import { describe, expect, it, vi } from "vitest";

import { PROTOCOL_VERSION, type WorkerResponse } from "../worker/protocol";
import { createSimulationWorkerHandler } from "../worker/simulation.worker";

function responsesFrom(
  postMessage: ReturnType<typeof vi.fn>,
): WorkerResponse[] {
  return postMessage.mock.calls.map(([response]) => response as WorkerResponse);
}

describe("preview scene worker", () => {
  it("emits finite transferable positions and moves them when time changes", () => {
    const postMessage = vi.fn();
    const handleMessage = createSimulationWorkerHandler({ postMessage });

    handleMessage({
      protocolVersion: PROTOCOL_VERSION,
      type: "initialize",
      generation: 1,
      baseUrl: "https://example.test/orbit-atlas/",
      datasetVersion: "preview-v1",
      objectIds: ["sun", "earth", "mars"],
    });
    const initial = responsesFrom(postMessage).find(
      (response) => response.type === "positions",
    );
    expect(initial?.type).toBe("positions");
    if (initial?.type !== "positions") {
      throw new Error("Expected initial positions");
    }
    expect(initial.positions).toBeInstanceOf(Float32Array);
    expect(initial.positions).toHaveLength(9);
    expect(Array.from(initial.positions).every(Number.isFinite)).toBe(true);
    expect(postMessage).toHaveBeenCalledWith(initial, [
      initial.positions.buffer,
    ]);

    handleMessage({
      protocolVersion: PROTOCOL_VERSION,
      type: "setTime",
      generation: 2,
      timeUtcMs: Date.UTC(2026, 3, 1),
    });
    const moved = responsesFrom(postMessage).at(-1);
    expect(moved?.type).toBe("positions");
    if (moved?.type !== "positions") {
      throw new Error("Expected moved positions");
    }
    expect(Array.from(moved.positions)).not.toEqual(
      Array.from(initial.positions),
    );
  });

  it("recomputes positions for frame and scale changes", () => {
    const postMessage = vi.fn();
    const handleMessage = createSimulationWorkerHandler({ postMessage });
    handleMessage({
      protocolVersion: PROTOCOL_VERSION,
      type: "initialize",
      generation: 1,
      baseUrl: "https://example.test/orbit-atlas/",
      datasetVersion: "preview-v1",
      objectIds: ["sun", "earth"],
    });
    handleMessage({
      protocolVersion: PROTOCOL_VERSION,
      type: "setReferenceFrame",
      generation: 2,
      referenceFrame: "EARTH_CENTERED",
    });
    const earthCentered = responsesFrom(postMessage).at(-1);
    expect(earthCentered?.type).toBe("positions");
    if (earthCentered?.type !== "positions") {
      throw new Error("Expected Earth-centered positions");
    }
    expect(Array.from(earthCentered.positions.slice(3, 6))).toEqual([0, 0, 0]);

    handleMessage({
      protocolVersion: PROTOCOL_VERSION,
      type: "setRenderContext",
      generation: 3,
      cameraOriginKm: [0, 0, 0],
      scaleMode: "RELATIVE",
    });
    const relative = responsesFrom(postMessage).at(-1);
    expect(relative?.type).toBe("positions");
    if (relative?.type !== "positions") {
      throw new Error("Expected relative positions");
    }
    expect(relative.positions).not.toEqual(earthCentered.positions);
  });
});
