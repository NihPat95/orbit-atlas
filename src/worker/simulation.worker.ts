/// <reference lib="webworker" />

import {
  PROTOCOL_VERSION,
  workerRequestSchema,
  type WorkerResponse,
} from "./protocol";
import {
  isPreviewObjectId,
  PREVIEW_DATASET_VERSION,
  PREVIEW_EPOCH_UTC_MS,
  previewPositionsAt,
} from "../data/previewCatalog";
import type { Vector3 } from "../domain/types";
import { toRenderPositionBuffer } from "../simulation/renderTransform";

interface WorkerPostTarget {
  postMessage(message: WorkerResponse, transfer: Transferable[]): void;
}

interface WorkerState {
  isInitialized: boolean;
  latestGeneration: number;
  objectIds: string[];
  datasetVersion: string | null;
  timeUtcMs: number;
  referenceFrame: "SUN_CENTERED" | "EARTH_CENTERED";
  cameraOriginKm: Vector3;
  scaleMode: "ILLUSTRATIVE" | "RELATIVE";
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
    datasetVersion: null,
    timeUtcMs: PREVIEW_EPOCH_UTC_MS,
    referenceFrame: "SUN_CENTERED",
    cameraOriginKm: [0, 0, 0],
    scaleMode: "ILLUSTRATIVE",
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
      if (
        request.datasetVersion !== PREVIEW_DATASET_VERSION ||
        request.objectIds.some((id) => !isPreviewObjectId(id))
      ) {
        postWorkerResponse(target, {
          protocolVersion: PROTOCOL_VERSION,
          type: "error",
          generation: request.generation,
          code: "INTERNAL",
          message: "The requested preview dataset is unavailable.",
        });
        return;
      }
      state.isInitialized = true;
      state.datasetVersion = request.datasetVersion;
      state.objectIds = [...request.objectIds];
      postWorkerResponse(target, {
        protocolVersion: PROTOCOL_VERSION,
        type: "ready",
        generation: request.generation,
        objectIds: [...state.objectIds],
      });
      emitPositions(target, state, request.generation);
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

    if (request.type === "setTime") {
      state.timeUtcMs = request.timeUtcMs;
    } else if (request.type === "setReferenceFrame") {
      state.referenceFrame = request.referenceFrame;
    } else {
      state.cameraOriginKm = request.cameraOriginKm;
      state.scaleMode = request.scaleMode;
    }
    emitPositions(target, state, request.generation);
  };
}

function emitPositions(
  target: WorkerPostTarget,
  state: WorkerState,
  generation: number,
): void {
  if (state.datasetVersion !== PREVIEW_DATASET_VERSION) {
    return;
  }
  const positions = previewPositionsAt(state.objectIds, state.timeUtcMs);
  const earth = previewPositionsAt(["earth"], state.timeUtcMs)[0];
  const framed =
    state.referenceFrame === "EARTH_CENTERED"
      ? positions.map((position): Vector3 => [
          position[0] - earth[0],
          position[1] - earth[1],
          position[2] - earth[2],
        ])
      : positions;
  const renderPositions = toRenderPositionBuffer(framed, {
    cameraOriginKm: state.cameraOriginKm,
    scaleMode: state.scaleMode,
  });
  postWorkerResponse(target, {
    protocolVersion: PROTOCOL_VERSION,
    type: "positions",
    generation,
    objectIds: [...state.objectIds],
    positions: renderPositions,
  });
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
