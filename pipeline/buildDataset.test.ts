import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { buildDataset } from "./buildDataset";
import { validateDataset } from "./validateDataset";
import type { DatasetBuildInput } from "./config";

describe("dataset publication pipeline", () => {
  it("writes byte-identical versioned assets to staging", async () => {
    const firstRoot = await mkdtemp(join(tmpdir(), "orbit-atlas-first-"));
    const secondRoot = await mkdtemp(join(tmpdir(), "orbit-atlas-second-"));
    const input = fixtureInput();

    const first = await buildDataset(input, { stagingRoot: firstRoot });
    const second = await buildDataset(input, { stagingRoot: secondRoot });

    expect(first.datasetVersion).toMatch(/^v1-[a-f0-9]{16}$/);
    expect(first.datasetVersion).toBe(second.datasetVersion);
    expect(first.files).toEqual(second.files);
    for (const path of first.files) {
      expect(await readFile(join(firstRoot, path))).toEqual(
        await readFile(join(secondRoot, path)),
      );
    }
    await expect(validateDataset(firstRoot)).resolves.toMatchObject({
      assetCount: 2,
      objectCount: 1,
    });
  });

  it.each([
    ["unknown event relationship", (input: DatasetBuildInput) => {
      input.catalog.events[0]!.objectId = "missing-object";
    }],
    ["unsafe motion path", (input: DatasetBuildInput) => {
      input.motionAssets[0]!.path = "../earth.json";
    }],
    ["non-finite vector", (input: DatasetBuildInput) => {
      const data = input.motionAssets[0]!.data;
      if ("samples" in data) {
        data.samples[0]!.positionKm[0] = Number.NaN;
      }
    }],
    ["reversed chronology", (input: DatasetBuildInput) => {
      const data = input.motionAssets[0]!.data;
      if ("samples" in data) data.samples.reverse();
    }],
    ["missing provenance", (input: DatasetBuildInput) => {
      input.catalog.objects[0]!.sourceIds = ["unknown-source"];
    }],
  ])("rejects %s before publishing", async (_label, mutate) => {
    const stagingRoot = await mkdtemp(join(tmpdir(), "orbit-atlas-invalid-"));
    const input = fixtureInput();
    mutate(input);

    await expect(buildDataset(input, { stagingRoot })).rejects.toThrow();
  });

  it("leaves the known-good public manifest untouched after failure", async () => {
    const root = await mkdtemp(join(tmpdir(), "orbit-atlas-safe-"));
    const publicDataRoot = join(root, "public", "data");
    await mkdir(publicDataRoot, { recursive: true });
    await writeFile(
      join(publicDataRoot, "manifest.json"),
      '{"datasetVersion":"known-good"}\n',
    );
    const input = fixtureInput();
    input.catalog.objects[0]!.sourceIds = ["unknown-source"];

    await expect(
      buildDataset(input, {
        publicDataRoot,
        stagingRoot: join(root, "staging"),
      }),
    ).rejects.toThrow();
    await expect(
      readFile(join(publicDataRoot, "manifest.json"), "utf8"),
    ).resolves.toBe('{"datasetVersion":"known-good"}\n');
  });
});

function fixtureInput(): DatasetBuildInput {
  return {
    generatedAt: "2026-10-17T20:00:00.000Z",
    sources: [
      {
        id: "jpl-horizons",
        provider: "JPL_HORIZONS",
        retrievedAt: "2026-10-17T19:00:00.000Z",
        sourceEpoch: "2026-01-01T00:00:00.000Z",
        checksum: `sha256:${"a".repeat(64)}`,
        attribution: "NASA/JPL Horizons",
        sourceUrl: "https://ssd.jpl.nasa.gov/horizons/",
      },
    ],
    catalog: {
      objects: [
        {
          id: "earth",
          canonicalName: "Earth",
          alternateNames: ["Terra"],
          category: "PLANET",
          summary: "Our home planet.",
          details: "Earth is the reference point for Earth-centered views.",
          defaultReferenceFrame: "SUN_CENTERED",
          scale: { radiusKm: 6371, illustrativeRadius: 1 },
          confidence: { level: "HIGH", summary: "JPL vectors." },
          limitations: ["Not suitable for navigation."],
          validity: {
            startUtc: "2026-01-01T00:00:00.000Z",
            endUtc: "2026-01-02T00:00:00.000Z",
          },
          sourceIds: ["jpl-horizons"],
          motion: {
            kind: "EPHEMERIS",
            frame: "ICRF_J2000",
            timeSystem: "UTC",
            segments: [
              {
                id: "2026-a",
                path: "motion/earth/2026-a.json",
                checksum: `sha256:${"0".repeat(64)}`,
                startUtc: "2026-01-01T00:00:00.000Z",
                endUtc: "2026-01-02T00:00:00.000Z",
              },
            ],
          },
        },
      ],
      events: [
        {
          id: "earth-reference",
          objectId: "earth",
          kind: "SEASONAL_MARKER",
          title: "Reference event",
          explanation: "Fixture event.",
          occurredAtUtc: "2026-01-01T12:00:00.000Z",
        },
      ],
    },
    motionAssets: [
      {
        path: "motion/earth/2026-a.json",
        data: {
          schemaVersion: 1,
          objectId: "earth",
          segmentId: "2026-a",
          frame: "ICRF_J2000",
          timeSystem: "UTC",
          startUtc: "2026-01-01T00:00:00.000Z",
          endUtc: "2026-01-02T00:00:00.000Z",
          samples: [
            {
              epochUtc: "2026-01-01T00:00:00.000Z",
              positionKm: [149_597_870.7, 0, 0],
              velocityKmPerSecond: [0, 29.78, 0],
            },
            {
              epochUtc: "2026-01-02T00:00:00.000Z",
              positionKm: [149_575_000, 2_572_000, 0],
              velocityKmPerSecond: [-0.51, 29.77, 0],
            },
          ],
        },
      },
    ],
  };
}
