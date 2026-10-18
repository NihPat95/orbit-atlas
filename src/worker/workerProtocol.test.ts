import { describe, expect, it, vi } from "vitest";

import { SimulationWorkerClient, type WorkerLike } from "./client";
import {
  PROTOCOL_VERSION,
  workerRequestSchema,
  type WorkerResponse,
} from "./protocol";
import {
  createSimulationWorkerHandler,
  postWorkerResponse,
} from "./simulation.worker";

describe("worker protocol", () => {
  it("accepts every versioned request variant", () => {
    const requests = [
      {
        protocolVersion: PROTOCOL_VERSION,
        type: "initialize",
        generation: 1,
        baseUrl: "https://example.test/orbit-atlas/",
        datasetVersion: "demo-2026",
        objectIds: ["earth"],
      },
      {
        protocolVersion: PROTOCOL_VERSION,
        type: "setTime",
        generation: 2,
        timeUtcMs: Date.UTC(2026, 9, 17),
      },
      {
        protocolVersion: PROTOCOL_VERSION,
        type: "setReferenceFrame",
        generation: 3,
        referenceFrame: "SUN_CENTERED",
      },
      {
        protocolVersion: PROTOCOL_VERSION,
        type: "setRenderContext",
        generation: 4,
        cameraOriginKm: [0, 0, 0],
        scaleMode: "ILLUSTRATIVE",
      },
    ];

    expect(
      requests.every(
        (request) => workerRequestSchema.safeParse(request).success,
      ),
    ).toBe(true);
  });

  it("rejects unsupported, non-finite, and oversized requests", () => {
    const oversizedIds = Array.from(
      { length: 1_001 },
      (_, index) => `object-${index}`,
    );

    expect(
      workerRequestSchema.safeParse({
        protocolVersion: 2,
        type: "setTime",
        generation: 1,
        timeUtcMs: 0,
      }).success,
    ).toBe(false);
    expect(
      workerRequestSchema.safeParse({
        protocolVersion: PROTOCOL_VERSION,
        type: "setTime",
        generation: 1,
        timeUtcMs: Number.POSITIVE_INFINITY,
      }).success,
    ).toBe(false);
    expect(
      workerRequestSchema.safeParse({
        protocolVersion: PROTOCOL_VERSION,
        type: "initialize",
        generation: 1,
        baseUrl: "https://example.test/",
        datasetVersion: "demo-2026",
        objectIds: oversizedIds,
      }).success,
    ).toBe(false);
  });

  it("discards stale responses after a newer request generation", () => {
    const worker = new FakeWorker();
    const client = new SimulationWorkerClient(worker);
    const listener = vi.fn();
    client.subscribe(listener);

    const staleGeneration = client.setTime(1_000);
    const currentGeneration = client.setTime(2_000);
    worker.emit(positionResponse(staleGeneration, 1));
    worker.emit(positionResponse(currentGeneration, 2));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        generation: currentGeneration,
        positions: new Float32Array([2, 0, 0]),
      }),
    );
    client.dispose();
  });

  it("transfers position buffers without cloning", () => {
    const positions = new Float32Array([1, 2, 3]);
    const response = positionResponse(1, positions[0]);
    response.positions = positions;
    const postMessage = vi.fn();

    postWorkerResponse({ postMessage }, response);

    expect(postMessage).toHaveBeenCalledWith(response, [positions.buffer]);
    expect(response.positions).toBe(positions);
  });

  it("turns malformed worker input into a stable error response", () => {
    const postMessage = vi.fn();
    const handleMessage = createSimulationWorkerHandler({ postMessage });

    handleMessage({
      protocolVersion: PROTOCOL_VERSION,
      type: "initialize",
      generation: 7,
      baseUrl: "not a URL",
      datasetVersion: "demo-2026",
      objectIds: ["earth"],
    });

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        protocolVersion: PROTOCOL_VERSION,
        type: "error",
        generation: 7,
        code: "INVALID_MESSAGE",
      }),
      [],
    );
  });
});

function positionResponse(
  generation: number,
  x: number,
): Extract<WorkerResponse, { type: "positions" }> {
  return {
    protocolVersion: PROTOCOL_VERSION,
    type: "positions",
    generation,
    objectIds: ["earth"],
    positions: new Float32Array([x, 0, 0]),
  };
}

class FakeWorker implements WorkerLike {
  readonly messages: unknown[] = [];
  private readonly listeners = new Set<
    (event: MessageEvent<unknown>) => void
  >();

  addEventListener(
    _type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void {
    this.listeners.add(listener);
  }

  postMessage(message: unknown): void {
    this.messages.push(message);
  }

  removeEventListener(
    _type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void {
    this.listeners.delete(listener);
  }

  emit(data: unknown): void {
    for (const listener of this.listeners) {
      listener(new MessageEvent("message", { data }));
    }
  }
}
