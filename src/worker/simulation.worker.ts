/// <reference lib="webworker" />

import {
  PROTOCOL_VERSION,
  workerRequestSchema,
  type WorkerResponse,
} from "./protocol";

interface WorkerPostTarget {
  postMessage(message: WorkerResponse, transfer: Transferable[]): void;
}

interface WorkerState {
  isInitialized: boolean;
  latestGeneration: number;
  objectIds: string[];
}

export function postWorkerResponse(
  target: WorkerPostTarget,
  response: WorkerResponse,
): void {
  const transfer =
    response.type === "positions" &&
    response.positions.buffer instanceof ArrayBuffer
      ? [response.positions.buffer]
      : [];
  target.postMessage(response, transfer);
}

export function createSimulationWorkerHandler(
  target: WorkerPostTarget,
): (message: unknown) => void {
  const state: WorkerState = {
    isInitialized: false,
    latestGeneration: 0,
    objectIds: [],
  };

  return (message: unknown): void => {
    const result = workerRequestSchema.safeParse(message);
    if (!result.success) {
      postWorkerResponse(target, {
        protocolVersion: PROTOCOL_VERSION,
        type: "error",
        generation: extractGeneration(message),
        code: "INVALID_MESSAGE",
        message: "Worker request did not match protocol version 1.",
      });
      return;
    }

    const request = result.data;
    if (request.generation < state.latestGeneration) {
      return;
    }
    state.latestGeneration = request.generation;

    if (request.type === "initialize") {
      state.isInitialized = true;
      state.objectIds = [...request.objectIds];
      postWorkerResponse(target, {
        protocolVersion: PROTOCOL_VERSION,
        type: "ready",
        generation: request.generation,
        objectIds: [...state.objectIds],
      });
      return;
    }

    if (!state.isInitialized) {
      postWorkerResponse(target, {
        protocolVersion: PROTOCOL_VERSION,
        type: "error",
        generation: request.generation,
        code: "NOT_INITIALIZED",
        message: "Initialize the simulation worker before updating it.",
      });
      return;
    }

    // Numerical responses are added by Tasks 7-9. Protocol-valid state updates are silent for now.
  };
}

function extractGeneration(message: unknown): number {
  if (
    typeof message === "object" &&
    message !== null &&
    "generation" in message &&
    typeof message.generation === "number" &&
    Number.isSafeInteger(message.generation) &&
    message.generation >= 0
  ) {
    return message.generation;
  }
  return 0;
}

if (
  typeof WorkerGlobalScope !== "undefined" &&
  globalThis instanceof WorkerGlobalScope
) {
  const scope = globalThis as unknown as DedicatedWorkerGlobalScope;
  const handleMessage = createSimulationWorkerHandler({
    postMessage: (message, transfer) => scope.postMessage(message, transfer),
  });
  scope.addEventListener("message", (event: MessageEvent<unknown>) =>
    handleMessage(event.data),
  );
}
