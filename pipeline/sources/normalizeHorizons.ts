import { createHash } from "node:crypto";

import {
  ephemerisSeriesSchema,
  sourceSnapshotSchema,
} from "../../src/domain/schemas";
import type { EphemerisSeries, SourceSnapshot } from "../../src/domain/types";
import {
  HORIZONS_API_URL,
  type HorizonsApiResponse,
  type HorizonsSegmentRequest,
} from "./horizons";

interface NormalizeOptions {
  retrievedAt: string;
}

export function normalizeHorizonsResponse(
  response: HorizonsApiResponse,
  request: HorizonsSegmentRequest,
  options: NormalizeOptions,
): { series: EphemerisSeries; source: SourceSnapshot } {
  if (
    response.signature?.version !== "1.2" &&
    response.signature?.version !== "1.3"
  ) {
    throw new Error(
      `Unsupported Horizons API version: ${response.signature?.version ?? "missing"}`,
    );
  }
  if (response.error)
    throw new Error(`Horizons provider error: ${response.error}`);
  if (!response.result)
    throw new Error("Horizons response has no result field");

  const table = response.result.match(/\$\$SOE\s*([\s\S]*?)\s*\$\$EOE/);
  if (!table) throw new Error("Horizons response has no vector table");
  const samples = table[1]
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map(parseVectorRow);
  const series = ephemerisSeriesSchema.parse({
    schemaVersion: 1,
    objectId: request.objectId,
    segmentId: request.segmentId,
    frame: "ICRF_J2000",
    timeSystem: "UTC",
    startUtc: request.startUtc,
    endUtc: request.endUtc,
    samples,
  });
  const source = sourceSnapshotSchema.parse({
    id: `jpl-${request.objectId}-${request.segmentId}`,
    provider: "JPL_HORIZONS",
    retrievedAt: options.retrievedAt,
    sourceEpoch: samples[0]?.epochUtc,
    checksum: `sha256:${createHash("sha256")
      .update(JSON.stringify(response))
      .digest("hex")}`,
    attribution: "NASA/JPL Horizons",
    sourceUrl: HORIZONS_API_URL,
  });
  return { series, source };
}

function parseVectorRow(line: string): EphemerisSeries["samples"][number] {
  const fields = line.split(",").map((field) => field.trim());
  if (fields.length < 8)
    throw new Error(`Malformed Horizons vector row: ${line}`);
  const vector = fields.slice(2, 8).map(Number);
  if (vector.some((value) => !Number.isFinite(value))) {
    throw new Error(`Malformed Horizons vector row: ${line}`);
  }
  return {
    epochUtc: parseHorizonsUtc(fields[1]!),
    positionKm: [vector[0]!, vector[1]!, vector[2]!],
    velocityKmPerSecond: [vector[3]!, vector[4]!, vector[5]!],
  };
}

function parseHorizonsUtc(value: string): string {
  const match = value.match(
    /^A\.D\.\s+(\d{4})-([A-Z][a-z]{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/,
  );
  if (!match) throw new Error(`Malformed Horizons UTC timestamp: ${value}`);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months.indexOf(match[2]!);
  if (month < 0) throw new Error(`Malformed Horizons UTC timestamp: ${value}`);
  const milliseconds = Number((match[7] ?? "").padEnd(3, "0").slice(0, 3));
  const epoch = Date.UTC(
    Number(match[1]),
    month,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
    milliseconds,
  );
  return new Date(epoch).toISOString();
}
