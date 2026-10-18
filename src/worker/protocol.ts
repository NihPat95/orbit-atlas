import { z } from "zod";

import { vector3Schema } from "../domain/schemas";

export const PROTOCOL_VERSION = 1 as const;
export const MAX_WORKER_OBJECTS = 1_000;

const generationSchema = z.number().int().nonnegative().safe();
const objectIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const requestBase = {
  protocolVersion: z.literal(PROTOCOL_VERSION),
  generation: generationSchema,
};

export const initializeRequestSchema = z
  .object({
    ...requestBase,
    type: z.literal("initialize"),
    baseUrl: z.url(),
    datasetVersion: objectIdSchema,
    objectIds: z.array(objectIdSchema).max(MAX_WORKER_OBJECTS),
  })
  .strict()
  .superRefine(({ objectIds }, context) => {
    if (new Set(objectIds).size !== objectIds.length) {
      context.addIssue({
        code: "custom",
        message: "Worker object IDs must be unique",
        path: ["objectIds"],
      });
    }
  });

export const workerRequestSchema = z.discriminatedUnion("type", [
  initializeRequestSchema,
  z
    .object({
      ...requestBase,
      type: z.literal("setTime"),
      timeUtcMs: z.number().finite().safe(),
    })
    .strict(),
  z
    .object({
      ...requestBase,
      type: z.literal("setReferenceFrame"),
      referenceFrame: z.enum(["SUN_CENTERED", "EARTH_CENTERED"]),
    })
    .strict(),
  z
    .object({
      ...requestBase,
      type: z.literal("setRenderContext"),
      cameraOriginKm: vector3Schema,
      scaleMode: z.enum(["ILLUSTRATIVE", "RELATIVE"]),
    })
    .strict(),
]);

const responseBase = {
  protocolVersion: z.literal(PROTOCOL_VERSION),
  generation: generationSchema,
};

const positionArraySchema = z.custom<Float32Array>(
  (value) =>
    value instanceof Float32Array &&
    value.length <= MAX_WORKER_OBJECTS * 3 &&
    Array.from(value).every(Number.isFinite),
  "Positions must be a finite bounded Float32Array",
);

const positionsResponseSchema = z
  .object({
    ...responseBase,
    type: z.literal("positions"),
    objectIds: z.array(objectIdSchema).max(MAX_WORKER_OBJECTS),
    positions: positionArraySchema,
  })
  .strict()
  .superRefine(({ objectIds, positions }, context) => {
    if (positions.length !== objectIds.length * 3) {
      context.addIssue({
        code: "custom",
        message: "Position buffer must contain three values for every object",
        path: ["positions"],
      });
    }
  });

export const workerResponseSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...responseBase,
      type: z.literal("ready"),
      objectIds: z.array(objectIdSchema).max(MAX_WORKER_OBJECTS),
    })
    .strict(),
  positionsResponseSchema,
  z
    .object({
      ...responseBase,
      type: z.literal("dataStatus"),
      objectId: objectIdSchema,
      status: z.enum([
        "LOADING",
        "READY",
        "OUT_OF_RANGE",
        "STALE",
        "UNAVAILABLE",
        "ERROR",
      ]),
      message: z.string().trim().min(1).max(500).optional(),
    })
    .strict(),
  z
    .object({
      ...responseBase,
      type: z.literal("error"),
      code: z.enum(["INTERNAL", "INVALID_MESSAGE", "NOT_INITIALIZED"]),
      message: z.string().trim().min(1).max(500),
    })
    .strict(),
]);

export type InitializeRequest = z.infer<typeof initializeRequestSchema>;
export type WorkerRequest = z.infer<typeof workerRequestSchema>;
export type WorkerResponse = z.infer<typeof workerResponseSchema>;
export type PositionsResponse = Extract<WorkerResponse, { type: "positions" }>;
