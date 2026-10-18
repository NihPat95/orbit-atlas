import type { z } from "zod";

import { matchesChecksum, type Sha256Checksum } from "./checksum";
import { DatasetError } from "./errors";
import {
  DATASET_SCHEMA_VERSION,
  catalogSchema,
  datasetSnapshotSchema,
  ephemerisSeriesSchema,
  manifestSchema,
  safeAssetPathSchema,
  satelliteElementSetSchema,
} from "../domain/schemas";
import type {
  DatasetCatalog,
  DatasetManifest,
  DatasetSnapshot,
  EphemerisSeries,
  SatelliteElementSet,
} from "../domain/types";

interface DatasetLoaderOptions {
  baseUrl: string | URL;
  fetchImpl?: typeof fetch;
}

interface IntegrityReference {
  path: string;
  checksum: string;
}

export interface DatasetLoader {
  loadCatalog(
    manifest: DatasetManifest,
    signal?: AbortSignal,
  ): Promise<DatasetCatalog>;
  loadEphemerisSegment(
    reference: IntegrityReference,
    signal?: AbortSignal,
  ): Promise<EphemerisSeries>;
  loadManifest(signal?: AbortSignal): Promise<DatasetManifest>;
  loadSatelliteElementSet(
    reference: IntegrityReference,
    signal?: AbortSignal,
  ): Promise<SatelliteElementSet>;
  loadSnapshot(signal?: AbortSignal): Promise<DatasetSnapshot>;
}

export function createDatasetLoader(
  options: DatasetLoaderOptions,
): DatasetLoader {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const fetchImpl = options.fetchImpl ?? fetch;

  async function loadManifest(signal?: AbortSignal): Promise<DatasetManifest> {
    return loadJson("data/manifest.json", manifestSchema, signal);
  }

  async function loadCatalog(
    manifest: DatasetManifest,
    signal?: AbortSignal,
  ): Promise<DatasetCatalog> {
    return loadJson(
      manifest.assets.catalog.path,
      catalogSchema,
      signal,
      asChecksum(
        manifest.assets.catalog.checksum,
        manifest.assets.catalog.path,
      ),
    );
  }

  async function loadSnapshot(signal?: AbortSignal): Promise<DatasetSnapshot> {
    const manifest = await loadManifest(signal);
    const catalog = await loadCatalog(manifest, signal);
    return parseSchema(
      datasetSnapshotSchema,
      { manifest, catalog },
      manifest.assets.catalog.path,
    );
  }

  async function loadEphemerisSegment(
    reference: IntegrityReference,
    signal?: AbortSignal,
  ): Promise<EphemerisSeries> {
    return loadJson(
      reference.path,
      ephemerisSeriesSchema,
      signal,
      asChecksum(reference.checksum, reference.path),
    );
  }

  async function loadSatelliteElementSet(
    reference: IntegrityReference,
    signal?: AbortSignal,
  ): Promise<SatelliteElementSet> {
    return loadJson(
      reference.path,
      satelliteElementSetSchema,
      signal,
      asChecksum(reference.checksum, reference.path),
    );
  }

  async function loadJson<T>(
    path: string,
    schema: z.ZodType<T>,
    signal?: AbortSignal,
    expectedChecksum?: Sha256Checksum,
  ): Promise<T> {
    const url = resolveAssetUrl(path, baseUrl);
    let response: Response;

    try {
      response = await fetchImpl(url, {
        headers: { Accept: "application/json" },
        signal,
      });
    } catch (error) {
      if (
        signal?.aborted ||
        (error instanceof DOMException && error.name === "AbortError")
      ) {
        throw new DatasetError("ABORTED", `Loading was cancelled: ${path}`, {
          assetPath: path,
          cause: error,
        });
      }
      throw new DatasetError(
        "NETWORK",
        `Network error while loading: ${path}`,
        {
          assetPath: path,
          cause: error,
        },
      );
    }

    if (!response.ok) {
      throw new DatasetError(
        "HTTP_STATUS",
        `Asset request failed with ${response.status}: ${path}`,
        {
          assetPath: path,
          status: response.status,
        },
      );
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (expectedChecksum && !(await matchesChecksum(bytes, expectedChecksum))) {
      throw new DatasetError(
        "CHECKSUM_MISMATCH",
        `Asset checksum did not match: ${path}`,
        {
          assetPath: path,
        },
      );
    }

    let value: unknown;
    try {
      value = JSON.parse(new TextDecoder().decode(bytes));
    } catch (error) {
      throw new DatasetError(
        "INVALID_JSON",
        `Asset is not valid JSON: ${path}`,
        {
          assetPath: path,
          cause: error,
        },
      );
    }

    return parseSchema(schema, value, path);
  }

  return {
    loadCatalog,
    loadEphemerisSegment,
    loadManifest,
    loadSatelliteElementSet,
    loadSnapshot,
  };
}

function normalizeBaseUrl(value: string | URL): URL {
  const url = new URL(value);
  url.pathname = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
  url.search = "";
  url.hash = "";
  return url;
}

function resolveAssetUrl(path: string, baseUrl: URL): URL {
  const parsedPath = safeAssetPathSchema.safeParse(path);
  if (!parsedPath.success) {
    throw new DatasetError("INVALID_SCHEMA", `Unsafe asset path: ${path}`, {
      assetPath: path,
      cause: parsedPath.error,
    });
  }

  const url = new URL(parsedPath.data, baseUrl);
  if (url.origin !== baseUrl.origin) {
    throw new DatasetError(
      "INVALID_SCHEMA",
      `Cross-origin asset path is not allowed: ${path}`,
      {
        assetPath: path,
      },
    );
  }
  return url;
}

function parseSchema<T>(schema: z.ZodType<T>, value: unknown, path: string): T {
  if (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    value.schemaVersion !== DATASET_SCHEMA_VERSION
  ) {
    throw new DatasetError(
      "UNSUPPORTED_SCHEMA",
      `Unsupported schema version in: ${path}`,
      {
        assetPath: path,
      },
    );
  }

  const result = schema.safeParse(value);
  if (!result.success) {
    throw new DatasetError(
      "INVALID_SCHEMA",
      `Asset failed schema validation: ${path}`,
      {
        assetPath: path,
        cause: result.error,
      },
    );
  }
  return result.data;
}

function asChecksum(value: string, path: string): Sha256Checksum {
  if (!/^sha256:[a-f0-9]{64}$/.test(value)) {
    throw new DatasetError("INVALID_SCHEMA", `Invalid checksum for: ${path}`, {
      assetPath: path,
    });
  }
  return value as Sha256Checksum;
}
