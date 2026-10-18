import { resolve } from "node:path";

import { fetchHorizonsSegment } from "./horizons";
import { normalizeHorizonsResponse } from "./normalizeHorizons";

const request = {
  objectId: "earth",
  segmentId: "live-smoke",
  command: "399",
  center: "500@10",
  startUtc: "2026-01-01T00:00:00.000Z",
  endUtc: "2026-01-03T00:00:00.000Z",
  stepSize: "1 day",
};

const fetched = await fetchHorizonsSegment(request, {
  cacheRoot: resolve(".staging/horizons-cache"),
});
const normalized = normalizeHorizonsResponse(fetched.payload, request, {
  retrievedAt: new Date().toISOString(),
});

process.stdout.write(
  `${JSON.stringify({
    objectId: normalized.series.objectId,
    sampleCount: normalized.series.samples.length,
    startUtc: normalized.series.samples[0]?.epochUtc,
    endUtc: normalized.series.samples.at(-1)?.epochUtc,
    cachePath: fetched.cachePath,
  })}\n`,
);
