import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import type {
  EphemerisSeries,
  SatelliteElementSet,
  SourceSnapshot,
} from "../src/domain/types";
import { buildDataset } from "./buildDataset";
import {
  humanMadeObjects,
  naturalObjects,
  notableEvents,
} from "./content/catalogContent";
import type {
  DatasetBuildInput,
  MotionAssetInput,
  PipelineOptions,
} from "./config";
import { horizonsCommands } from "./recordProviderData";
import { normalizeHorizonsResponse } from "./sources/normalizeHorizons";
import { normalizeOmm } from "./sources/normalizeOmm";
import { validateDataset } from "./validateDataset";

const generatedAt = "2026-10-18T00:00:00.000Z";

export async function generateRepresentativeDataset(
  options: Required<PipelineOptions>,
) {
  return publishInput(representativeInput(), options);
}

export async function generateAuthoritativeDataset(
  options: Required<PipelineOptions>,
  recordingRoot = resolve("pipeline/recordings"),
) {
  const objects = [...naturalObjects, ...humanMadeObjects].map((object) =>
    structuredClone(object),
  );
  const sources: SourceSnapshot[] = [sourceSnapshots()[1]!];
  const motionAssets: MotionAssetInput[] = [];
  for (const object of objects) {
    if (object.motion.kind === "EPHEMERIS") {
      const segment = object.motion.segments[0]!;
      const payload = JSON.parse(
        await readFile(`${recordingRoot}/horizons/${object.id}.json`, "utf8"),
      );
      const normalized = normalizeHorizonsResponse(
        payload,
        {
          objectId: object.id,
          segmentId: segment.id,
          command: horizonsCommands[object.id]!,
          center: "500@10",
          startUtc: segment.startUtc,
          endUtc: segment.endUtc,
          stepSize: "24",
        },
        { retrievedAt: generatedAt },
      );
      object.sourceIds = object.sourceIds.map((id) =>
        id === "jpl-horizons" ? normalized.source.id : id,
      );
      sources.push(normalized.source);
      motionAssets.push({ path: segment.path, data: normalized.series });
    } else {
      const payload = JSON.parse(
        await readFile(`${recordingRoot}/celestrak/${object.id}.json`, "utf8"),
      );
      const noradCatalogId = object.id === "iss" ? 25544 : 20580;
      const normalized = normalizeOmm(
        payload,
        { objectId: object.id, noradCatalogId },
        { retrievedAt: generatedAt },
      );
      sources.push(normalized.source);
      motionAssets.push({
        path: object.motion.path,
        data: normalized.elements,
      });
    }
  }
  return publishInput(
    {
      generatedAt,
      sources,
      catalog: { objects, events: notableEvents },
      motionAssets,
    },
    options,
  );
}

async function publishInput(
  input: DatasetBuildInput,
  options: Required<PipelineOptions>,
) {
  const built = await buildDataset(input, options);
  await validateDataset(options.stagingRoot);

  const publicRoot = dirname(resolve(options.publicDataRoot));
  const assetPaths = built.files.filter(
    (path) => path !== "data/manifest.json",
  );
  for (const path of assetPaths) {
    const target = join(publicRoot, path);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(options.stagingRoot, path), target);
  }
  await mkdir(resolve(options.publicDataRoot), { recursive: true });
  await copyFile(
    join(options.stagingRoot, "data/manifest.json"),
    join(resolve(options.publicDataRoot), "manifest.json"),
  );
  await validateDataset(publicRoot);

  const hash = createHash("sha256");
  let totalBytes = 0;
  for (const path of built.files) {
    const bytes = await readFile(join(options.stagingRoot, path));
    hash.update(bytes);
    totalBytes += bytes.byteLength;
  }
  return { ...built, contentHash: hash.digest("hex"), totalBytes };
}

function representativeInput(): DatasetBuildInput {
  const objects = [...naturalObjects, ...humanMadeObjects].map((object) => {
    const copy = structuredClone(object);
    if (copy.motion.kind === "EPHEMERIS") {
      copy.sourceIds = copy.sourceIds.map((id) =>
        id === "jpl-horizons" ? "procedural-seed" : id,
      );
      copy.confidence = {
        level: "LOW",
        summary:
          "Procedural seed motion validates dataset integration and awaits authoritative JPL replacement.",
      };
      copy.limitations = [
        ...copy.limitations,
        "This staged integration motion is procedural and does not represent an authoritative ephemeris.",
      ];
    }
    return copy;
  });
  return {
    generatedAt,
    sources: sourceSnapshots(),
    catalog: { objects, events: notableEvents },
    motionAssets: objects.map((object, index): MotionAssetInput =>
      object.motion.kind === "EPHEMERIS"
        ? {
            path: object.motion.segments[0]!.path,
            data: ephemerisFor(object, index),
          }
        : { path: object.motion.path, data: elementsFor(object.id) },
    ),
  };
}

function sourceSnapshots(): SourceSnapshot[] {
  const common = {
    retrievedAt: generatedAt,
    checksum: `sha256:${"a".repeat(64)}`,
  } as const;
  return [
    {
      id: "procedural-seed",
      provider: "CURATED",
      sourceEpoch: "1900-01-01T00:00:00.000Z",
      attribution:
        "Orbit Atlas procedural integration seed; not an authoritative ephemeris",
      sourceUrl: "https://ssd.jpl.nasa.gov/horizons/",
      ...common,
    },
    {
      id: "nasa-curated",
      provider: "CURATED",
      attribution: "NASA and ESA public mission reference material",
      sourceUrl: "https://science.nasa.gov/solar-system/",
      ...common,
    },
    {
      id: "celestrak-iss-25544",
      provider: "CELESTRAK",
      sourceEpoch: "2026-10-17T19:43:43.038Z",
      attribution: "CelesTrak OMM GP data",
      sourceUrl:
        "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=JSON",
      ...common,
    },
    {
      id: "celestrak-hubble-20580",
      provider: "CELESTRAK",
      sourceEpoch: "2026-10-17T18:00:00.000Z",
      attribution: "CelesTrak OMM GP data",
      sourceUrl:
        "https://celestrak.org/NORAD/elements/gp.php?CATNR=20580&FORMAT=JSON",
      ...common,
    },
  ];
}

function ephemerisFor(
  object: (typeof naturalObjects)[number],
  index: number,
): EphemerisSeries {
  const segment =
    object.motion.kind === "EPHEMERIS" ? object.motion.segments[0]! : undefined;
  if (!segment) throw new Error(`Expected ephemeris object: ${object.id}`);
  const start = Date.parse(segment.startUtc);
  const end = Date.parse(segment.endUtc);
  const radius = object.id === "sun" ? 0 : 40_000_000 + index * 73_000_000;
  const periodDays = object.id === "sun" ? 1 : 88 + index * index * 37;
  const samples = Array.from({ length: 25 }, (_, sampleIndex) => {
    const fraction = sampleIndex / 24;
    const epoch = start + (end - start) * fraction;
    const angle =
      ((epoch - start) / 86_400_000 / periodDays) * Math.PI * 2 + index;
    const speed =
      radius === 0 ? 0 : (radius * Math.PI * 2) / (periodDays * 86_400);
    return {
      epochUtc: new Date(epoch).toISOString(),
      positionKm: [
        radius * Math.cos(angle),
        radius * Math.sin(angle),
        radius * 0.02 * Math.sin(angle / 3),
      ] as [number, number, number],
      velocityKmPerSecond: [
        -speed * Math.sin(angle),
        speed * Math.cos(angle),
        (speed * 0.02 * Math.cos(angle / 3)) / 3,
      ] as [number, number, number],
    };
  });
  return {
    schemaVersion: 1,
    objectId: object.id,
    segmentId: segment.id,
    frame: "ICRF_J2000",
    timeSystem: "UTC",
    startUtc: segment.startUtc,
    endUtc: segment.endUtc,
    samples,
  };
}

function elementsFor(objectId: string): SatelliteElementSet {
  const iss = objectId === "iss";
  const epochUtc = iss
    ? "2026-10-17T19:43:43.038Z"
    : "2026-10-17T18:00:00.000Z";
  return {
    schemaVersion: 1,
    objectId,
    sourceId: iss ? "celestrak-iss-25544" : "celestrak-hubble-20580",
    noradCatalogId: iss ? 25544 : 20580,
    elementSetNumber: 999,
    epochUtc,
    validity: {
      startUtc: "2026-10-10T00:00:00.000Z",
      endUtc: "2026-10-25T00:00:00.000Z",
    },
    meanMotionRevsPerDay: iss ? 15.49 : 15.1,
    eccentricity: iss ? 0.00043 : 0.00028,
    inclinationDeg: iss ? 51.64 : 28.47,
    rightAscensionAscendingNodeDeg: 123.45,
    argumentOfPericenterDeg: 82.34,
    meanAnomalyDeg: 277.81,
    bstar: 0.00012,
  };
}
