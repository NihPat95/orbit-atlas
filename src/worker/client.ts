import {
  PROTOCOL_VERSION,
  workerRequestSchema,
  workerResponseSchema,
  type InitializeRequest,
  type WorkerRequest,
  type WorkerResponse,
} from "./protocol";
import type { Vector3 } from "../domain/types";

export interface WorkerLike {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void;
  postMessage(message: unknown, transfer?: Transferable[]): void;
  removeEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void,
  ): void;
  terminate?: () => void;
}

type WorkerResponseListener = (response: WorkerResponse) => void;

export class SimulationWorkerClient {
  private generation = 0;
  private readonly listeners = new Set<WorkerResponseListener>();

  constructor(private readonly worker: WorkerLike) {
    worker.addEventListener("message", this.handleMessage);
  }

  initialize(
    input: Omit<InitializeRequest, "generation" | "protocolVersion" | "type">,
  ): number {
    return this.send({ ...input, type: "initialize" });
  }

  setTime(timeUtcMs: number): number {
    return this.send({ type: "setTime", timeUtcMs });
  }

  setReferenceFrame(referenceFrame: "SUN_CENTERED" | "EARTH_CENTERED"): number {
    return this.send({ type: "setReferenceFrame", referenceFrame });
  }

  setRenderContext(
    cameraOriginKm: Vector3,
    scaleMode: "ILLUSTRATIVE" | "RELATIVE",
  ): number {
    return this.send({ type: "setRenderContext", cameraOriginKm, scaleMode });
  }

  subscribe(listener: WorkerResponseListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.worker.removeEventListener("message", this.handleMessage);
    this.listeners.clear();
    this.worker.terminate?.();
  }

  private readonly handleMessage = (event: MessageEvent<unknown>): void => {
    const parsed = workerResponseSchema.safeParse(event.data);
    if (!parsed.success || parsed.data.generation !== this.generation) {
      return;
    }

    for (const listener of this.listeners) {
      listener(parsed.data);
    }
  };

  private send(
    input:
      | Omit<
          Extract<WorkerRequest, { type: "initialize" }>,
          "generation" | "protocolVersion"
        >
      | Omit<
          Extract<WorkerRequest, { type: "setTime" }>,
          "generation" | "protocolVersion"
        >
      | Omit<
          Extract<WorkerRequest, { type: "setReferenceFrame" }>,
          "generation" | "protocolVersion"
        >
      | Omit<
          Extract<WorkerRequest, { type: "setRenderContext" }>,
          "generation" | "protocolVersion"
        >,
  ): number {
    this.generation += 1;
    const request = workerRequestSchema.parse({
      ...input,
      protocolVersion: PROTOCOL_VERSION,
      generation: this.generation,
    });
    this.worker.postMessage(request);
    return this.generation;
  }
}
