import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { createDatasetLoader } from "../data/datasetLoader";
import type { DatasetManifest } from "../domain/types";
import { validDatasetSnapshot } from "../test/dataFixtures";

describe("static trust boundary", () => {
  it("ships a same-origin restrictive CSP", async () => {
    const html = await readFile("index.html", "utf8");
    expect(html).toContain("default-src 'self'");
    expect(html).toContain("connect-src 'self'");
    expect(html).toContain("object-src 'none'");
    expect(html).not.toContain("connect-src *");
  });

  it("rejects traversal and cross-origin asset paths before fetching", async () => {
    const loader = createDatasetLoader({
      baseUrl: "https://example.test/orbit-atlas/",
      fetchImpl: async () => {
        throw new Error("fetch must not run for unsafe paths");
      },
    });
    const manifest = structuredClone(
      validDatasetSnapshot.manifest,
    ) as DatasetManifest;
    manifest.assets.catalog.path = "../secrets.json";
    await expect(loader.loadCatalog(manifest)).rejects.toMatchObject({
      code: "INVALID_SCHEMA",
    });
    manifest.assets.catalog.path = "https://evil.example/data.json";
    await expect(loader.loadCatalog(manifest)).rejects.toMatchObject({
      code: "INVALID_SCHEMA",
    });
  });
});
