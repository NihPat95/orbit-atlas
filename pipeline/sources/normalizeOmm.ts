import { createHash } from "node:crypto";
import { z } from "zod";

import {
  satelliteElementSetSchema,
  sourceSnapshotSchema,
} from "../../src/domain/schemas";
import type {
  SatelliteElementSet,
  SourceSnapshot,
} from "../../src/domain/types";
import { CELESTRAK_GP_URL } from "./celestrak";

const rawOmmSchema = z
  .object({
    EPOCH: z.string().min(1),
    MEAN_MOTION: z.number().finite().positive(),
    ECCENTRICITY: z.number().finite().gte(0).lt(1),
    INCLINATION: z.number().finite().gte(0).lte(180),
    RA_OF_ASC_NODE: z.number().finite().gte(0).lt(360),
    ARG_OF_PERICENTER: z.number().finite().gte(0).lt(360),
    MEAN_ANOMALY: z.number().finite().gte(0).lt(360),
    NORAD_CAT_ID: z.number().int().positive(),
    ELEMENT_SET_NO: z.number().int().nonnegative(),
    BSTAR: z.number().finite(),
  })
  .passthrough();

interface OmmRequest {
  objectId: string;
  noradCatalogId: number;
}

interface NormalizeOmmOptions {
  retrievedAt: string;
  staleAfterDays?: number;
  validityDays?: number;
}

export interface NormalizedOmm {
  elements: SatelliteElementSet;
  source: SourceSnapshot;
  status: "CURRENT" | "STALE";
  elementAgeDays: number;
}

export function normalizeOmm(
  payload: unknown[],
  request: OmmRequest,
  options: NormalizeOmmOptions,
): NormalizedOmm {
  const matching = payload
    .map((record) => rawOmmSchema.parse(record))
    .filter((record) => record.NORAD_CAT_ID === request.noradCatalogId);
  if (matching.length === 0) {
    throw new Error(
      `CelesTrak returned no record for NORAD ${request.noradCatalogId}`,
    );
  }
  const epochs = matching.map((record) => normalizeEpoch(record.EPOCH));
  if (new Set(epochs).size !== epochs.length) {
    throw new Error("CelesTrak returned duplicate epochs");
  }
  matching.sort(
    (left, right) =>
      Date.parse(normalizeEpoch(right.EPOCH)) -
      Date.parse(normalizeEpoch(left.EPOCH)),
  );
  const record = matching[0]!;
  const epochUtc = normalizeEpoch(record.EPOCH);
  const epochMs = Date.parse(epochUtc);
  const validityDays = options.validityDays ?? 7;
  const validityMs = validityDays * 86_400_000;
  const sourceId = `celestrak-${request.objectId}-${request.noradCatalogId}`;
  const elements = satelliteElementSetSchema.parse({
    schemaVersion: 1,
    objectId: request.objectId,
    sourceId,
    noradCatalogId: record.NORAD_CAT_ID,
    elementSetNumber: record.ELEMENT_SET_NO,
    epochUtc,
    validity: {
      startUtc: new Date(epochMs - validityMs).toISOString(),
      endUtc: new Date(epochMs + validityMs).toISOString(),
    },
    meanMotionRevsPerDay: record.MEAN_MOTION,
    eccentricity: record.ECCENTRICITY,
    inclinationDeg: record.INCLINATION,
    rightAscensionAscendingNodeDeg: record.RA_OF_ASC_NODE,
    argumentOfPericenterDeg: record.ARG_OF_PERICENTER,
    meanAnomalyDeg: record.MEAN_ANOMALY,
    bstar: record.BSTAR,
  });
  const elementAgeDays =
    (Date.parse(options.retrievedAt) - epochMs) / 86_400_000;
  if (!Number.isFinite(elementAgeDays)) {
    throw new Error("CelesTrak retrieval time is invalid");
  }
  const sourceUrl = new URL(CELESTRAK_GP_URL);
  sourceUrl.searchParams.set("CATNR", String(request.noradCatalogId));
  sourceUrl.searchParams.set("FORMAT", "JSON");
  const source = sourceSnapshotSchema.parse({
    id: sourceId,
    provider: "CELESTRAK",
    retrievedAt: options.retrievedAt,
    sourceEpoch: epochUtc,
    checksum: `sha256:${createHash("sha256")
      .update(JSON.stringify(payload))
      .digest("hex")}`,
    attribution: "CelesTrak GP data in OMM JSON format",
    sourceUrl: sourceUrl.href,
  });
  return {
    elements,
    source,
    status:
      Math.abs(elementAgeDays) > (options.staleAfterDays ?? 2)
        ? "STALE"
        : "CURRENT",
    elementAgeDays,
  };
}

function normalizeEpoch(epoch: string): string {
  const withZone = /(?:Z|[+-]\d\d:\d\d)$/.test(epoch) ? epoch : `${epoch}Z`;
  const timestamp = Date.parse(withZone);
  if (!Number.isFinite(timestamp))
    throw new Error(`Invalid OMM epoch: ${epoch}`);
  return new Date(timestamp).toISOString();
}
