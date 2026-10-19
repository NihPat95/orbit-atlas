import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { catalogSchema, manifestSchema } from "../src/domain/schemas";
import { generateRepresentativeDataset } from "./generateRepresentativeDataset";
import { validateDataset } from "./validateDataset";

describe("representative dataset generation", () => {
  it("publishes a deterministic, complete 25-object dataset after validation", async () => {
    const firstRoot = await mkdtemp(join(tmpdir(), "orbit-live-first-"));
    const secondRoot = await mkdtemp(join(tmpdir(), "orbit-live-second-"));

    const first = await generateRepresentativeDataset({
      stagingRoot: join(firstRoot, "staging"),
      publicDataRoot: join(firstRoot, "public", "data"),
    });
    const second = await generateRepresentativeDataset({
      stagingRoot: join(secondRoot, "staging"),
      publicDataRoot: join(secondRoot, "public", "data"),
    });
    const manifest = manifestSchema.parse(
      JSON.parse(
        await readFile(join(firstRoot, "public/data/manifest.json"), "utf8"),
      ),
    );
    const catalog = catalogSchema.parse(
      JSON.parse(
        await readFile(
          join(firstRoot, "public", manifest.assets.catalog.path),
          "utf8",
        ),
      ),
    );

    expect(first.datasetVersion).toBe(second.datasetVersion);
    expect(first.contentHash).toBe(second.contentHash);
    expect(catalog.objects).toHaveLength(25);
    expect(manifest.assets.motion).toHaveLength(25);
    const humanIds = new Set([
      "iss",
      "hubble",
      "jwst",
      "voyager-1",
      "parker-solar-probe",
    ]);
    expect(
      catalog.objects
        .filter((object) => !humanIds.has(object.id))
        .every(
          (object) =>
            object.validity.startUtc.startsWith("1900") &&
            object.validity.endUtc.startsWith("2100"),
        ),
    ).toBe(true);
    expect(first.totalBytes).toBeLessThan(8_000_000);
    await expect(
      validateDataset(join(firstRoot, "public")),
    ).resolves.toMatchObject({ objectCount: 25, assetCount: 26 });
  });
});
