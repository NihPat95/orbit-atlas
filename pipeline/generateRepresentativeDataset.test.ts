import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  catalogSchema,
  ephemerisSeriesSchema,
  manifestSchema,
  satelliteElementSetSchema,
} from "../src/domain/schemas";
import { generateAuthoritativeDataset } from "./generateRepresentativeDataset";
import { validateDataset } from "./validateDataset";

describe("representative dataset generation", () => {
  it("publishes a deterministic, complete 25-object dataset after validation", async () => {
    const firstRoot = await mkdtemp(join(tmpdir(), "orbit-live-first-"));
    const secondRoot = await mkdtemp(join(tmpdir(), "orbit-live-second-"));

    const first = await generateAuthoritativeDataset({
      stagingRoot: join(firstRoot, "staging"),
      publicDataRoot: join(firstRoot, "public", "data"),
    });
    const second = await generateAuthoritativeDataset({
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
    const initialUtcMs = Date.UTC(2026, 9, 18);
    for (const object of catalog.objects) {
      if (object.motion.kind === "EPHEMERIS") {
        const segment = ephemerisSeriesSchema.parse(
          JSON.parse(
            await readFile(
              join(firstRoot, "public", object.motion.segments[0].path),
              "utf8",
            ),
          ),
        );
        expect(segment.samples).toHaveLength(25);
        expect(Date.parse(segment.startUtc)).toBeLessThanOrEqual(initialUtcMs);
        expect(Date.parse(segment.endUtc)).toBeGreaterThanOrEqual(initialUtcMs);
      } else {
        const elements = satelliteElementSetSchema.parse(
          JSON.parse(
            await readFile(
              join(firstRoot, "public", object.motion.path),
              "utf8",
            ),
          ),
        );
        expect(Date.parse(elements.validity.startUtc)).toBeLessThanOrEqual(
          initialUtcMs,
        );
        expect(Date.parse(elements.validity.endUtc)).toBeGreaterThanOrEqual(
          initialUtcMs,
        );
      }
    }
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
