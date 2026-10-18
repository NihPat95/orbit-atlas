import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { fetchHorizonsSegment } from "./horizons";
import { normalizeHorizonsResponse } from "./normalizeHorizons";
import fixture from "../fixtures/horizons.json";

const request = {
  objectId: "earth",
  segmentId: "1900-2100-boundaries",
  command: "399",
  center: "500@10",
  startUtc: "1900-01-01T00:00:00.000Z",
  endUtc: "2100-01-01T00:00:00.000Z",
  stepSize: "200 years",
};

describe("JPL Horizons ingestion", () => {
  it("normalizes ordered kilometre vectors and UTC boundary timestamps", () => {
    const normalized = normalizeHorizonsResponse(fixture.success, request, {
      retrievedAt: "2026-10-17T21:00:00.000Z",
    });

    expect(normalized.series.samples).toEqual([
      {
        epochUtc: "1900-01-01T00:00:00.000Z",
        positionKm: [-26_000_000, 144_000_000, 0],
        velocityKmPerSecond: [-29.5, -5.2, 0.001],
      },
      {
        epochUtc: "2100-01-01T00:00:00.000Z",
        positionKm: [-25_000_000, 145_000_000, 1000],
        velocityKmPerSecond: [-29.6, -5.1, 0.002],
      },
    ]);
    expect(normalized.source).toMatchObject({
      provider: "JPL_HORIZONS",
      sourceEpoch: "1900-01-01T00:00:00.000Z",
      attribution: "NASA/JPL Horizons",
    });
  });

  it("rejects provider errors and malformed vector rows", () => {
    expect(() =>
      normalizeHorizonsResponse(fixture.error, request, {
        retrievedAt: "2026-10-17T21:00:00.000Z",
      }),
    ).toThrow("Horizons provider error");
    expect(() =>
      normalizeHorizonsResponse(fixture.malformed, request, {
        retrievedAt: "2026-10-17T21:00:00.000Z",
      }),
    ).toThrow("Malformed Horizons vector row");
  });

  it("rejects an unknown API response version", () => {
    const response = structuredClone(fixture.success);
    response.signature.version = "9.9";

    expect(() =>
      normalizeHorizonsResponse(response, request, {
        retrievedAt: "2026-10-17T21:00:00.000Z",
      }),
    ).toThrow("Unsupported Horizons API version: 9.9");
  });

  it("caches successful responses and reuses them without another request", async () => {
    const cacheRoot = await mkdtemp(join(tmpdir(), "orbit-horizons-"));
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify(fixture.success), { status: 200 }),
    );

    const first = await fetchHorizonsSegment(request, { cacheRoot, fetcher });
    const second = await fetchHorizonsSegment(request, { cacheRoot, fetcher });

    expect(first.payload).toEqual(fixture.success);
    expect(second.payload).toEqual(fixture.success);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await expect(readFile(first.cachePath, "utf8")).resolves.toContain(
      '"signature"',
    );
  });

  it("reports bounded upstream HTTP failures without caching them", async () => {
    const cacheRoot = await mkdtemp(join(tmpdir(), "orbit-horizons-error-"));
    const fetcher = vi.fn(async () => new Response("busy", { status: 429 }));

    await expect(
      fetchHorizonsSegment(request, { cacheRoot, fetcher, attempts: 2 }),
    ).rejects.toThrow("Horizons request failed with HTTP 429 after 2 attempts");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
