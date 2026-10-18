import { describe, expect, it, vi } from "vitest";

import { sha256 } from "./checksum";
import { createDatasetLoader } from "./datasetLoader";
import { DatasetError } from "./errors";
import {
  validDatasetSnapshot,
  validEphemerisSeries,
} from "../test/dataFixtures";

const baseUrl = "https://example.test/orbit-atlas/";

describe("dataset loader", () => {
  it("loads and validates same-origin manifest, catalog, and motion assets", async () => {
    const fixture = await createLoaderFixture();
    const requestedUrls: string[] = [];
    const fetchImpl = createFixtureFetch(fixture.responses, requestedUrls);
    const loader = createDatasetLoader({ baseUrl, fetchImpl });

    const snapshot = await loader.loadSnapshot();
    const object = snapshot.catalog.objects[0];
    if (object.motion.kind !== "EPHEMERIS") {
      throw new Error("Expected ephemeris fixture");
    }
    const series = await loader.loadEphemerisSegment(object.motion.segments[0]);

    expect(snapshot.catalog.objects[0].canonicalName).toBe("Earth");
    expect(series.objectId).toBe("earth");
    expect(requestedUrls).toEqual([
      `${baseUrl}data/manifest.json`,
      `${baseUrl}data/demo-2026/catalog.json`,
      `${baseUrl}data/demo-2026/motion/earth/2026.json`,
    ]);
  });

  it("returns a typed error for a missing asset", async () => {
    const loader = createDatasetLoader({
      baseUrl,
      fetchImpl: vi.fn(
        async () => new Response("missing", { status: 404 }),
      ) as typeof fetch,
    });

    await expect(loader.loadManifest()).rejects.toMatchObject({
      code: "HTTP_STATUS",
      status: 404,
    });
  });

  it("returns a typed error for a checksum mismatch", async () => {
    const fixture = await createLoaderFixture();
    const corruptManifest = structuredClone(fixture.manifest);
    corruptManifest.assets.catalog.checksum = `sha256:${"f".repeat(64)}`;
    fixture.responses.set(
      "data/manifest.json",
      JSON.stringify(corruptManifest),
    );
    const loader = createDatasetLoader({
      baseUrl,
      fetchImpl: createFixtureFetch(fixture.responses),
    });

    await expect(loader.loadSnapshot()).rejects.toMatchObject({
      code: "CHECKSUM_MISMATCH",
    });
  });

  it("returns a typed error for unsupported schemas", async () => {
    const manifest = structuredClone(validDatasetSnapshot.manifest) as Record<
      string,
      unknown
    >;
    manifest.schemaVersion = 99;
    const loader = createDatasetLoader({
      baseUrl,
      fetchImpl: createFixtureFetch(
        new Map([["data/manifest.json", JSON.stringify(manifest)]]),
      ),
    });

    await expect(loader.loadManifest()).rejects.toMatchObject({
      code: "UNSUPPORTED_SCHEMA",
    });
  });

  it("normalizes aborted requests without hiding the abort reason", async () => {
    const abortReason = new DOMException("Cancelled by test", "AbortError");
    const loader = createDatasetLoader({
      baseUrl,
      fetchImpl: vi.fn(async () => Promise.reject(abortReason)) as typeof fetch,
    });

    await expect(loader.loadManifest()).rejects.toEqual(
      expect.objectContaining<Partial<DatasetError>>({
        code: "ABORTED",
        cause: abortReason,
      }),
    );
  });
});

async function createLoaderFixture() {
  const ephemerisJson = JSON.stringify(validEphemerisSeries);
  const ephemerisChecksum = await checksumText(ephemerisJson);
  const catalog = structuredClone(validDatasetSnapshot.catalog);
  const object = catalog.objects[0];
  if (object.motion.kind !== "EPHEMERIS") {
    throw new Error("Expected ephemeris fixture");
  }
  object.motion.segments[0].checksum = ephemerisChecksum;
  const catalogJson = JSON.stringify(catalog);
  const manifest = structuredClone(validDatasetSnapshot.manifest);
  manifest.assets.catalog.checksum = await checksumText(catalogJson);
  manifest.assets.catalog.bytes = new TextEncoder().encode(
    catalogJson,
  ).byteLength;
  manifest.assets.motion[0].checksum = ephemerisChecksum;
  manifest.assets.motion[0].bytes = new TextEncoder().encode(
    ephemerisJson,
  ).byteLength;

  return {
    manifest,
    responses: new Map([
      ["data/manifest.json", JSON.stringify(manifest)],
      [manifest.assets.catalog.path, catalogJson],
      [manifest.assets.motion[0].path, ephemerisJson],
    ]),
  };
}

function createFixtureFetch(
  responses: Map<string, string>,
  requestedUrls: string[] = [],
): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = input.toString();
    requestedUrls.push(url);
    const path = url.replace(baseUrl, "");
    const body = responses.get(path);
    return body === undefined
      ? new Response("missing", { status: 404 })
      : new Response(body, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
  }) as typeof fetch;
}

async function checksumText(value: string): Promise<`sha256:${string}`> {
  return sha256(new TextEncoder().encode(value));
}
