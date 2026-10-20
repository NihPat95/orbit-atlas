import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { humanMadeObjects, naturalObjects } from "./content/catalogContent";
import { fetchCelestrakOmm } from "./sources/celestrak";
import { fetchHorizonsSegment } from "./sources/horizons";

export const horizonsCommands: Record<string, string> = {
  sun: "10",
  mercury: "199",
  venus: "299",
  earth: "399",
  moon: "301",
  mars: "499",
  jupiter: "599",
  saturn: "699",
  uranus: "799",
  neptune: "899",
  io: "501",
  europa: "502",
  ganymede: "503",
  callisto: "504",
  titan: "606",
  triton: "801",
  ceres: "1;",
  pluto: "999",
  halley: "1P",
  "67p-churyumov-gerasimenko": "90000703;",
  jwst: "-170",
  "voyager-1": "-31",
  "parker-solar-probe": "-96",
};

export async function recordProviderData(
  recordingRoot = resolve("pipeline/recordings"),
  onlyIds: ReadonlySet<string> = new Set(),
): Promise<void> {
  const cacheRoot = resolve(".staging/provider-cache");
  const ephemerisObjects = [...naturalObjects, ...humanMadeObjects].filter(
    (object) =>
      object.motion.kind === "EPHEMERIS" &&
      (onlyIds.size === 0 || onlyIds.has(object.id)),
  );
  for (const object of ephemerisObjects) {
    if (object.motion.kind !== "EPHEMERIS") continue;
    const segment = object.motion.segments[0]!;
    const fetched = await fetchHorizonsSegment(
      {
        objectId: object.id,
        segmentId: segment.id,
        command: horizonsCommands[object.id]!,
        center: "500@10",
        startUtc: segment.startUtc,
        endUtc: segment.endUtc,
        stepSize: "24",
      },
      { cacheRoot },
    );
    await writeRecording(
      `${recordingRoot}/horizons/${object.id}.json`,
      fetched.payload,
    );
  }
  for (const [objectId, noradCatalogId] of [
    ["iss", 25544],
    ["hubble", 20580],
  ] as const) {
    if (onlyIds.size > 0 && !onlyIds.has(objectId)) continue;
    const fetched = await fetchCelestrakOmm(noradCatalogId, { cacheRoot });
    await writeRecording(
      `${recordingRoot}/celestrak/${objectId}.json`,
      fetched.payload,
    );
  }
}

async function writeRecording(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await recordProviderData(
    resolve("pipeline/recordings"),
    new Set(process.argv.slice(2)),
  );
}
