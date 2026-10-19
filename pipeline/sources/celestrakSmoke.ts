import { resolve } from "node:path";

import { propagateSatellite } from "../../src/simulation/satellite";
import { fetchCelestrakOmm } from "./celestrak";
import { normalizeOmm } from "./normalizeOmm";

const request = { objectId: "iss", noradCatalogId: 25544 };
const fetched = await fetchCelestrakOmm(request.noradCatalogId, {
  cacheRoot: resolve(".staging/celestrak-cache"),
});
const normalized = normalizeOmm(fetched.payload, request, {
  retrievedAt: new Date().toISOString(),
});
const propagated = propagateSatellite(
  normalized.elements,
  Date.parse(normalized.elements.epochUtc),
);
if (propagated.status !== "READY") {
  throw new Error(`Live OMM failed SGP4 validation: ${propagated.status}`);
}

process.stdout.write(
  `${JSON.stringify({
    objectId: normalized.elements.objectId,
    noradCatalogId: normalized.elements.noradCatalogId,
    epochUtc: normalized.elements.epochUtc,
    status: normalized.status,
    sgp4Status: propagated.status,
    cachePath: fetched.cachePath,
  })}\n`,
);
