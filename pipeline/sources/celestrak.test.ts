import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { propagateSatellite } from "../../src/simulation/satellite";
import { utcMilliseconds } from "../../src/simulation/time";
import fixture from "../fixtures/celestrak.json";
import { fetchCelestrakOmm } from "./celestrak";
import { normalizeOmm } from "./normalizeOmm";

const request = { objectId: "iss", noradCatalogId: 25544 };

describe("CelesTrak OMM ingestion", () => {
  it("normalizes OMM fields and remains compatible with SGP4", () => {
    const normalized = normalizeOmm(fixture.success, request, {
      retrievedAt: "2026-10-17T20:00:00.000Z",
    });
    const propagated = propagateSatellite(
      normalized.elements,
      utcMilliseconds(normalized.elements.epochUtc),
    );

    expect(normalized.status).toBe("CURRENT");
    expect(normalized.elements).toMatchObject({
      objectId: "iss",
      noradCatalogId: 25544,
      sourceId: "celestrak-iss-25544",
    });
    expect(propagated.status).toBe("READY");
    if (propagated.status === "READY") {
      expect(propagated.state.positionKm.every(Number.isFinite)).toBe(true);
    }
  });

  it("returns an explicit stale status based on element age", () => {
    const normalized = normalizeOmm(fixture.success, request, {
      retrievedAt: "2026-10-21T20:00:00.000Z",
      staleAfterDays: 2,
    });

    expect(normalized.status).toBe("STALE");
    expect(normalized.elementAgeDays).toBeGreaterThan(4);
  });

  it("rejects missing objects, malformed fields, and duplicate epochs", () => {
    expect(() =>
      normalizeOmm([], request, {
        retrievedAt: "2026-10-17T20:00:00.000Z",
      }),
    ).toThrow("CelesTrak returned no record for NORAD 25544");
    expect(() =>
      normalizeOmm(fixture.malformed, request, {
        retrievedAt: "2026-10-17T20:00:00.000Z",
      }),
    ).toThrow();
    expect(() =>
      normalizeOmm(fixture.duplicate, request, {
        retrievedAt: "2026-10-17T20:00:00.000Z",
      }),
    ).toThrow("CelesTrak returned duplicate epochs");
  });

  it("caches a successful CATNR JSON response", async () => {
    const cacheRoot = await mkdtemp(join(tmpdir(), "orbit-celestrak-"));
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify(fixture.success), { status: 200 }),
    );

    const first = await fetchCelestrakOmm(25544, { cacheRoot, fetcher });
    const second = await fetchCelestrakOmm(25544, { cacheRoot, fetcher });

    expect(first.payload).toEqual(fixture.success);
    expect(second.payload).toEqual(fixture.success);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
