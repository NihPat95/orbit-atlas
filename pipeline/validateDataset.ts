import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { z } from "zod";

import {
  catalogSchema,
  datasetSnapshotSchema,
  ephemerisSeriesSchema,
  manifestSchema,
  safeAssetPathSchema,
  satelliteElementSetSchema,
} from "../src/domain/schemas";
import type {
  DatasetCatalog,
  DatasetManifest,
  EphemerisSeries,
  SatelliteElementSet,
} from "../src/domain/types";

const textDecoder = new TextDecoder();

export interface DatasetValidationResult {
  datasetVersion: string;
  objectCount: number;
  assetCount: number;
}

export interface DatasetBundle {
  manifest: DatasetManifest;
  catalog: DatasetCatalog;
  motion: Map<string, EphemerisSeries | SatelliteElementSet>;
  bytes: Map<string, Uint8Array>;
}

export async function validateDataset(
  datasetRoot: string,
): Promise<DatasetValidationResult> {
  const root = resolve(datasetRoot);
  const manifestBytes = await readAsset(root, "data/manifest.json");
  const manifest = parseJson(manifestBytes, manifestSchema, "data/manifest.json");
  const catalogBytes = await readAsset(root, manifest.assets.catalog.path);
  const catalog = parseJson(
    catalogBytes,
    catalogSchema,
    manifest.assets.catalog.path,
  );
  const bytes = new Map<string, Uint8Array>([
    [manifest.assets.catalog.path, catalogBytes],
  ]);
  const motion = new Map<string, EphemerisSeries | SatelliteElementSet>();

  for (const asset of manifest.assets.motion) {
    const assetBytes = await readAsset(root, asset.path);
    bytes.set(asset.path, assetBytes);
    const object = catalog.objects.find((candidate) =>
      referencedPaths(candidate).includes(asset.path),
    );
    if (!object) throw new Error(`Unreferenced motion asset: ${asset.path}`);
    const data =
      object.motion.kind === "EPHEMERIS"
        ? parseJson(assetBytes, ephemerisSeriesSchema, asset.path)
        : parseJson(assetBytes, satelliteElementSetSchema, asset.path);
    motion.set(asset.path, data);
  }

  return validateDatasetBundle({ manifest, catalog, motion, bytes });
}

export function validateDatasetBundle(
  bundle: DatasetBundle,
): DatasetValidationResult {
  const { manifest, catalog, motion, bytes } = bundle;
  datasetSnapshotSchema.parse({ manifest, catalog });
  const versionPrefix = `data/${manifest.datasetVersion}/`;
  const references = catalog.objects.flatMap(referencedPaths);

  if (!manifest.assets.catalog.path.startsWith(versionPrefix)) {
    throw new Error("Catalog path does not belong to the dataset version");
  }
  if (new Set(references).size !== references.length) {
    throw new Error("Motion paths must be referenced exactly once");
  }
  if (references.length !== manifest.assets.motion.length) {
    throw new Error("Motion asset record count does not match catalog references");
  }

  for (const asset of [manifest.assets.catalog, ...manifest.assets.motion]) {
    safeAssetPathSchema.parse(asset.path);
    if (!asset.path.startsWith(versionPrefix)) {
      throw new Error(`Asset path does not belong to the dataset: ${asset.path}`);
    }
    const assetBytes = bytes.get(asset.path);
    if (!assetBytes) throw new Error(`Missing asset bytes: ${asset.path}`);
    if (assetBytes.byteLength !== asset.bytes) {
      throw new Error(`Asset byte count mismatch: ${asset.path}`);
    }
    if (checksum(assetBytes) !== asset.checksum) {
      throw new Error(`Asset checksum mismatch: ${asset.path}`);
    }
  }

  for (const object of catalog.objects) {
    for (const path of referencedPaths(object)) {
      const data = motion.get(path);
      if (!data) throw new Error(`Missing parsed motion asset: ${path}`);
      if (data.objectId !== object.id) {
        throw new Error(`Motion object ID mismatch: ${path}`);
      }
      if (object.motion.kind === "EPHEMERIS") {
        const segment = object.motion.segments.find(
          (candidate) => candidate.path === path,
        );
        if (!("segmentId" in data) || data.segmentId !== segment?.id) {
          throw new Error(`Motion segment ID mismatch: ${path}`);
        }
      } else if (!("noradCatalogId" in data)) {
        throw new Error(`Expected satellite elements: ${path}`);
      }
    }
  }

  return {
    datasetVersion: manifest.datasetVersion,
    objectCount: catalog.objects.length,
    assetCount: 1 + manifest.assets.motion.length,
  };
}

export function checksum(bytes: Uint8Array): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function readAsset(root: string, path: string): Promise<Uint8Array> {
  safeAssetPathSchema.parse(path);
  const target = resolve(root, path);
  if (!target.startsWith(`${root}${sep}`)) {
    throw new Error(`Asset escapes dataset root: ${path}`);
  }
  return readFile(target);
}

function parseJson<T>(bytes: Uint8Array, schema: z.ZodType<T>, path: string): T {
  try {
    return schema.parse(JSON.parse(textDecoder.decode(bytes)));
  } catch (error) {
    throw new Error(`Invalid dataset asset: ${path}`, { cause: error });
  }
}

function referencedPaths(object: DatasetCatalog["objects"][number]): string[] {
  return object.motion.kind === "EPHEMERIS"
    ? object.motion.segments.map(({ path }) => path)
    : [object.motion.path];
}
