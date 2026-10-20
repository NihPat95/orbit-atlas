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
import type { EphemerisSeries, SatelliteElementSet } from "../domain/types";
import { createDatasetLoader } from "../data/datasetLoader";
import {
  interpolateEphemeris,
  type ScientificState,
} from "../simulation/ephemeris";
import { propagateSatellite } from "../simulation/satellite";
import { satelliteTemeToSunCentered } from "../simulation/frames";
import { toRenderPositionBuffer } from "../simulation/renderTransform";

interface WorkerPostTarget {
  postMessage(message: WorkerResponse, transfer: Transferable[]): void;
}

interface WorkerState {
  isInitialized: boolean;
  isInitializing: boolean;
  latestGeneration: number;
  objectIds: string[];
  datasetVersion: string | null;
  timeUtcMs: number;
  referenceFrame: "SUN_CENTERED" | "EARTH_CENTERED";
  cameraOriginKm: Vector3;
  scaleMode: "ILLUSTRATIVE" | "RELATIVE";
  ephemerides: Map<string, EphemerisSeries>;
  satellites: Map<string, SatelliteElementSet>;
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
    isInitializing: false,
    latestGeneration: 0,
    objectIds: [],
    datasetVersion: null,
    timeUtcMs: PREVIEW_EPOCH_UTC_MS,
    referenceFrame: "SUN_CENTERED",
    cameraOriginKm: [0, 0, 0],
    scaleMode: "ILLUSTRATIVE",
    ephemerides: new Map(),
    satellites: new Map(),
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
      state.datasetVersion = request.datasetVersion;
      state.objectIds = [...request.objectIds];
      if (request.datasetVersion === PREVIEW_DATASET_VERSION) {
        if (request.objectIds.some((id) => !isPreviewObjectId(id))) {
          emitWorkerError(
            target,
            request.generation,
            "The requested preview dataset is unavailable.",
          );
          return;
        }
        state.isInitialized = true;
        emitReady(target, state, request.generation);
        emitPositions(target, state, request.generation);
      } else {
        state.isInitializing = true;
        void initializeVersionedDataset(
          target,
          state,
          request.baseUrl,
          request.datasetVersion,
        );
      }
      return;
    }

    if (!state.isInitialized) {
      if (state.isInitializing) {
        if (request.type === "setTime") state.timeUtcMs = request.timeUtcMs;
        else if (request.type === "setReferenceFrame")
          state.referenceFrame = request.referenceFrame;
        else {
          state.cameraOriginKm = request.cameraOriginKm;
          state.scaleMode = request.scaleMode;
        }
        return;
      }
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
  const scientific =
    state.datasetVersion === PREVIEW_DATASET_VERSION
      ? previewPositionsAt(state.objectIds, state.timeUtcMs)
      : versionedPositionsAt(target, state, generation);
  const earth =
    state.datasetVersion === PREVIEW_DATASET_VERSION
      ? previewPositionsAt(["earth"], state.timeUtcMs)[0]
      : (versionedPositionAt(state, "earth", state.timeUtcMs)?.positionKm ?? [
          0, 0, 0,
        ]);
  const framed =
    state.referenceFrame === "EARTH_CENTERED"
      ? scientific.map((position): Vector3 => [
          position[0] - earth[0],
          position[1] - earth[1],
          position[2] - earth[2],
        ])
      : scientific;
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

async function initializeVersionedDataset(
  target: WorkerPostTarget,
  state: WorkerState,
  baseUrl: string,
  datasetVersion: string,
): Promise<void> {
  try {
    const loader = createDatasetLoader({ baseUrl });
    const snapshot = await loader.loadSnapshot();
    if (
      snapshot.manifest.datasetVersion !== datasetVersion ||
      snapshot.catalog.datasetVersion !== datasetVersion
    )
      throw new Error("Dataset version does not match the requested version.");
    const byId = new Map(
      snapshot.catalog.objects.map((object) => [object.id, object]),
    );
    if (state.objectIds.some((id) => !byId.has(id)))
      throw new Error("The requested dataset object is unavailable.");
    await Promise.all(
      state.objectIds.map(async (id) => {
        const object = byId.get(id)!;
        if (object.motion.kind === "EPHEMERIS") {
          const reference = object.motion.segments[0];
          state.ephemerides.set(
            id,
            await loader.loadEphemerisSegment(reference),
          );
        } else {
          state.satellites.set(
            id,
            await loader.loadSatelliteElementSet(object.motion),
          );
        }
      }),
    );
    state.isInitializing = false;
    state.isInitialized = true;
    emitReady(target, state, state.latestGeneration);
    emitPositions(target, state, state.latestGeneration);
  } catch (error) {
    state.isInitializing = false;
    emitWorkerError(
      target,
      state.latestGeneration,
      error instanceof Error
        ? error.message
        : "The versioned dataset could not be initialized.",
    );
  }
}

function versionedPositionsAt(
  target: WorkerPostTarget,
  state: WorkerState,
  generation: number,
): Vector3[] {
  return state.objectIds.map((id) => {
    const result = versionedPositionAt(state, id, state.timeUtcMs);
    if (!result) {
      postWorkerResponse(target, {
        protocolVersion: PROTOCOL_VERSION,
        type: "dataStatus",
        generation,
        objectId: id,
        status: "OUT_OF_RANGE",
        message: "No defensible position is available at this date.",
      });
      return [0, 0, 0];
    }
    const earth =
      id === "earth"
        ? result
        : versionedPositionAt(state, "earth", state.timeUtcMs);
    if (state.satellites.has(id) && earth)
      return satelliteTemeToSunCentered(result, earth, state.timeUtcMs)
        .positionKm;
    return result.positionKm;
  });
}

function versionedPositionAt(
  state: WorkerState,
  id: string,
  timeUtcMs: number,
): ScientificState | undefined {
  const series = state.ephemerides.get(id);
  if (series) {
    const result = interpolateEphemeris(series, timeUtcMs);
    return result.status === "READY" ? result.state : undefined;
  }
  const elements = state.satellites.get(id);
  if (elements) {
    const result = propagateSatellite(elements, timeUtcMs);
    return result.status === "READY" || result.status === "STALE"
      ? result.state
      : undefined;
  }
  return undefined;
}

function emitReady(
  target: WorkerPostTarget,
  state: WorkerState,
  generation: number,
): void {
  postWorkerResponse(target, {
    protocolVersion: PROTOCOL_VERSION,
    type: "ready",
    generation,
    objectIds: [...state.objectIds],
  });
}

function emitWorkerError(
  target: WorkerPostTarget,
  generation: number,
  message: string,
): void {
  postWorkerResponse(target, {
    protocolVersion: PROTOCOL_VERSION,
    type: "error",
    generation,
    code: "INTERNAL",
    message,
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
