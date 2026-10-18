import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  catalogSchema,
  ephemerisSeriesSchema,
  manifestSchema,
  safeAssetPathSchema,
  satelliteElementSetSchema,
} from "../src/domain/schemas";
import type {
  EphemerisSeries,
  SatelliteElementSet,
  SpaceObject,
} from "../src/domain/types";
import type { DatasetBuildInput, PipelineOptions } from "./config";
import {
  checksum,
  validateDatasetBundle,
  type DatasetBundle,
  type DatasetValidationResult,
} from "./validateDataset";

const textEncoder = new TextEncoder();

export interface DatasetBuildResult extends DatasetValidationResult {
  files: string[];
}

export async function buildDataset(
  input: DatasetBuildInput,
  options: PipelineOptions,
): Promise<DatasetBuildResult> {
  const normalized = normalizeInput(input);
  const seedBytes = encodeJson(normalized);
  const datasetVersion = `v1-${checksum(seedBytes).slice(7, 23)}`;
  const versionPrefix = `data/${datasetVersion}`;
  const bytes = new Map<string, Uint8Array>();
  const motion = new Map<string, EphemerisSeries | SatelliteElementSet>();
  const motionMetadata = new Map<
    string,
    { path: string; checksum: `sha256:${string}`; bytes: number }
  >();

  for (const asset of normalized.motionAssets) {
    const logicalPath = safeLogicalMotionPath(asset.path);
    const servedPath = `${versionPrefix}/${logicalPath}`;
    const schema =
      "samples" in asset.data
        ? ephemerisSeriesSchema
        : satelliteElementSetSchema;
    const data = schema.parse(asset.data);
    const assetBytes = encodeJson(data);
    const metadata = {
      path: servedPath,
      checksum: checksum(assetBytes),
      bytes: assetBytes.byteLength,
    };
    bytes.set(servedPath, assetBytes);
    motion.set(servedPath, data);
    motionMetadata.set(logicalPath, metadata);
  }

  const catalog = catalogSchema.parse({
    schemaVersion: 1,
    datasetVersion,
    objects: normalized.catalog.objects.map((object) =>
      finalizeObject(object, versionPrefix, motionMetadata),
    ),
    events: normalized.catalog.events,
  });
  const catalogPath = `${versionPrefix}/catalog.json`;
  const catalogBytes = encodeJson(catalog);
  bytes.set(catalogPath, catalogBytes);

  const manifest = manifestSchema.parse({
    schemaVersion: 1,
    datasetVersion,
    generatedAt: normalized.generatedAt,
    sources: normalized.sources,
    assets: {
      catalog: {
        path: catalogPath,
        checksum: checksum(catalogBytes),
        bytes: catalogBytes.byteLength,
      },
      motion: [...motionMetadata.values()].sort((a, b) =>
        a.path.localeCompare(b.path),
      ),
    },
  });
  const bundle: DatasetBundle = { manifest, catalog, motion, bytes };
  const validation = validateDatasetBundle(bundle);
  const manifestPath = "data/manifest.json";
  const files = [manifestPath, ...bytes.keys()].sort();

  for (const path of files) {
    const outputPath = join(options.stagingRoot, path);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(
      outputPath,
      path === manifestPath ? encodeJson(manifest) : bytes.get(path)!,
    );
  }

  return { ...validation, files };
}

function normalizeInput(input: DatasetBuildInput): DatasetBuildInput {
  return {
    generatedAt: input.generatedAt,
    sources: structuredClone(input.sources).sort((a, b) =>
      a.id.localeCompare(b.id),
    ),
    catalog: {
      objects: structuredClone(input.catalog.objects).sort((a, b) =>
        a.id.localeCompare(b.id),
      ),
      events: structuredClone(input.catalog.events).sort((a, b) =>
        a.id.localeCompare(b.id),
      ),
    },
    motionAssets: structuredClone(input.motionAssets).sort((a, b) =>
      a.path.localeCompare(b.path),
    ),
  };
}

function finalizeObject(
  object: SpaceObject,
  versionPrefix: string,
  metadata: Map<
    string,
    { path: string; checksum: `sha256:${string}`; bytes: number }
  >,
): SpaceObject {
  const finalized = structuredClone(object);
  if (finalized.motion.kind === "EPHEMERIS") {
    finalized.motion.segments = finalized.motion.segments.map((segment) => {
      const logicalPath = safeLogicalMotionPath(segment.path);
      const asset = metadata.get(logicalPath);
      if (!asset) throw new Error(`Missing motion input: ${logicalPath}`);
      return { ...segment, path: asset.path, checksum: asset.checksum };
    });
  } else {
    const logicalPath = safeLogicalMotionPath(finalized.motion.path);
    const asset = metadata.get(logicalPath);
    if (!asset) throw new Error(`Missing motion input: ${logicalPath}`);
    finalized.motion.path = asset.path;
    finalized.motion.checksum = asset.checksum;
  }
  if (!finalized.motion.kind) {
    throw new Error(`Invalid motion configuration under ${versionPrefix}`);
  }
  return finalized;
}

function safeLogicalMotionPath(path: string): string {
  safeAssetPathSchema.parse(path);
  if (!path.startsWith("motion/")) {
    throw new Error(`Motion input path must start with motion/: ${path}`);
  }
  return path;
}

export function encodeJson(value: unknown): Uint8Array {
  return textEncoder.encode(`${stableStringify(value)}\n`);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error("Cannot serialize undefined");
  return serialized;
}
