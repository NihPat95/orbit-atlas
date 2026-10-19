import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const CELESTRAK_GP_URL = "https://celestrak.org/NORAD/elements/gp.php";

interface FetchCelestrakOptions {
  cacheRoot: string;
  fetcher?: typeof fetch;
  attempts?: number;
}

export async function fetchCelestrakOmm(
  noradCatalogId: number,
  options: FetchCelestrakOptions,
): Promise<{ payload: unknown[]; cachePath: string }> {
  if (!Number.isSafeInteger(noradCatalogId) || noradCatalogId <= 0) {
    throw new Error("NORAD catalog ID must be a positive integer");
  }
  const cachePath = join(options.cacheRoot, `${noradCatalogId}.json`);
  try {
    return {
      payload: JSON.parse(await readFile(cachePath, "utf8")),
      cachePath,
    };
  } catch (error) {
    if (!isMissingFile(error)) throw error;
  }

  const fetcher = options.fetcher ?? fetch;
  const attempts = options.attempts ?? 2;
  let lastStatus = 0;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetcher(buildCelestrakUrl(noradCatalogId));
    lastStatus = response.status;
    if (response.ok) {
      const payload = (await response.json()) as unknown;
      if (!Array.isArray(payload)) {
        throw new Error("CelesTrak response must be a JSON array");
      }
      await mkdir(options.cacheRoot, { recursive: true });
      await writeFile(cachePath, `${JSON.stringify(payload)}\n`);
      return { payload, cachePath };
    }
  }
  throw new Error(
    `CelesTrak request failed with HTTP ${lastStatus} after ${attempts} attempts`,
  );
}

export function buildCelestrakUrl(noradCatalogId: number): URL {
  const url = new URL(CELESTRAK_GP_URL);
  // Query and OMM JSON contract: https://celestrak.org/NORAD/documentation/gp-data-formats.php
  url.searchParams.set("CATNR", String(noradCatalogId));
  url.searchParams.set("FORMAT", "JSON");
  return url;
}

function isMissingFile(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
