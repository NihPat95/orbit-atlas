import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const HORIZONS_API_URL = "https://ssd.jpl.nasa.gov/api/horizons.api";

export interface HorizonsSegmentRequest {
  objectId: string;
  segmentId: string;
  command: string;
  center: string;
  startUtc: string;
  endUtc: string;
  stepSize: string;
}

export interface HorizonsApiResponse {
  signature?: { source?: string; version?: string };
  result?: string;
  error?: string;
}

interface FetchHorizonsOptions {
  cacheRoot: string;
  fetcher?: typeof fetch;
  attempts?: number;
}

export async function fetchHorizonsSegment(
  request: HorizonsSegmentRequest,
  options: FetchHorizonsOptions,
): Promise<{ payload: HorizonsApiResponse; cachePath: string }> {
  const cacheKey = createHash("sha256")
    .update(JSON.stringify(request))
    .digest("hex");
  const cachePath = join(options.cacheRoot, `${cacheKey}.json`);
  try {
    return {
      payload: JSON.parse(await readFile(cachePath, "utf8")),
      cachePath,
    };
  } catch (error) {
    if (!isMissingFile(error)) throw error;
  }

  const fetcher = options.fetcher ?? fetch;
  const attempts = options.attempts ?? 3;
  let lastStatus = 0;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetcher(buildHorizonsUrl(request));
    lastStatus = response.status;
    if (response.ok) {
      const payload = (await response.json()) as HorizonsApiResponse;
      await mkdir(options.cacheRoot, { recursive: true });
      await writeFile(cachePath, `${JSON.stringify(payload)}\n`);
      return { payload, cachePath };
    }
  }
  throw new Error(
    `Horizons request failed with HTTP ${lastStatus} after ${attempts} attempts`,
  );
}

export function buildHorizonsUrl(request: HorizonsSegmentRequest): URL {
  const url = new URL(HORIZONS_API_URL);
  // Parameter contract: https://ssd-api.jpl.nasa.gov/doc/horizons.html
  const parameters = {
    format: "json",
    COMMAND: request.command,
    OBJ_DATA: "NO",
    MAKE_EPHEM: "YES",
    EPHEM_TYPE: "VECTORS",
    CENTER: request.center,
    START_TIME: request.startUtc,
    STOP_TIME: request.endUtc,
    STEP_SIZE: request.stepSize,
    TIME_TYPE: "UT",
    TIME_DIGITS: "FRACSEC",
    REF_SYSTEM: "ICRF",
    REF_PLANE: "FRAME",
    OUT_UNITS: "KM-S",
    VEC_TABLE: "2",
    VEC_CORR: "NONE",
    CSV_FORMAT: "YES",
    VEC_LABELS: "NO",
  };
  for (const [key, value] of Object.entries(parameters)) {
    url.searchParams.set(key, value);
  }
  return url;
}

function isMissingFile(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
