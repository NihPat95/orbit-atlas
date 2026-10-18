import type { Vector3 } from "../domain/types";

export const PREVIEW_DATASET_VERSION = "preview-v1";
export const PREVIEW_EPOCH_UTC_MS = Date.UTC(2026, 0, 1);

export interface PreviewObject {
  id: string;
  canonicalName: string;
  alternateNames: readonly string[];
  category: "STAR" | "PLANET" | "MOON" | "SPACECRAFT";
  color: string;
  radiusKm: number;
  orbitRadiusKm: number;
  orbitalPeriodDays: number;
  phaseRadians: number;
  inclinationRadians: number;
  parentId?: string;
  validFromUtcMs?: number;
  validToUtcMs?: number;
  freshUntilUtcMs?: number;
}

export const previewCatalog = [
  {
    id: "sun",
    canonicalName: "Sun",
    alternateNames: ["Sol"],
    category: "STAR",
    color: "#f2c46f",
    radiusKm: 696_340,
    orbitRadiusKm: 0,
    orbitalPeriodDays: 1,
    phaseRadians: 0,
    inclinationRadians: 0,
  },
  {
    id: "mercury",
    canonicalName: "Mercury",
    alternateNames: [],
    category: "PLANET",
    color: "#b9ada0",
    radiusKm: 2_439.7,
    orbitRadiusKm: 57_909_050,
    orbitalPeriodDays: 87.969,
    phaseRadians: 0.5,
    inclinationRadians: 0.122,
  },
  {
    id: "venus",
    canonicalName: "Venus",
    alternateNames: [],
    category: "PLANET",
    color: "#d9b574",
    radiusKm: 6_051.8,
    orbitRadiusKm: 108_208_000,
    orbitalPeriodDays: 224.701,
    phaseRadians: 1.7,
    inclinationRadians: 0.059,
  },
  {
    id: "earth",
    canonicalName: "Earth",
    alternateNames: ["Terra"],
    category: "PLANET",
    color: "#71b8c6",
    radiusKm: 6_371,
    orbitRadiusKm: 149_598_023,
    orbitalPeriodDays: 365.256,
    phaseRadians: 2.9,
    inclinationRadians: 0,
  },
  {
    id: "moon",
    canonicalName: "Moon",
    alternateNames: ["Luna"],
    category: "MOON",
    color: "#d6d8d0",
    radiusKm: 1_737.4,
    orbitRadiusKm: 384_400,
    orbitalPeriodDays: 27.322,
    phaseRadians: 0.9,
    inclinationRadians: 0.089,
    parentId: "earth",
  },
  {
    id: "mars",
    canonicalName: "Mars",
    alternateNames: ["The Red Planet"],
    category: "PLANET",
    color: "#c87050",
    radiusKm: 3_389.5,
    orbitRadiusKm: 227_939_366,
    orbitalPeriodDays: 686.98,
    phaseRadians: 4.1,
    inclinationRadians: 0.032,
  },
  {
    id: "jupiter",
    canonicalName: "Jupiter",
    alternateNames: [],
    category: "PLANET",
    color: "#c5a481",
    radiusKm: 69_911,
    orbitRadiusKm: 778_479_000,
    orbitalPeriodDays: 4_332.59,
    phaseRadians: 5.2,
    inclinationRadians: 0.023,
  },
  {
    id: "saturn",
    canonicalName: "Saturn",
    alternateNames: [],
    category: "PLANET",
    color: "#d2bd86",
    radiusKm: 58_232,
    orbitRadiusKm: 1_433_529_000,
    orbitalPeriodDays: 10_759.22,
    phaseRadians: 3.65,
    inclinationRadians: 0.043,
  },
  {
    id: "iss",
    canonicalName: "International Space Station",
    alternateNames: ["ISS", "Zarya"],
    category: "SPACECRAFT",
    color: "#eef5f6",
    radiusKm: 0.055,
    orbitRadiusKm: 6_791,
    orbitalPeriodDays: 0.0646,
    phaseRadians: 1.2,
    inclinationRadians: 0.901,
    parentId: "earth",
    validFromUtcMs: Date.UTC(2025, 0, 1),
    validToUtcMs: Date.UTC(2027, 11, 31),
    freshUntilUtcMs: Date.UTC(2026, 0, 15),
  },
] as const satisfies readonly PreviewObject[];

export const PREVIEW_GLOBAL_VALIDITY = {
  fromUtcMs: Date.UTC(1900, 0, 1),
  toUtcMs: Date.UTC(2100, 11, 31),
} as const;

export function previewValidityFor(objectId?: string | null) {
  const object = objectId ? previewById.get(objectId) : undefined;
  if (!object?.validFromUtcMs || !object.validToUtcMs) {
    return PREVIEW_GLOBAL_VALIDITY;
  }
  return {
    fromUtcMs: object.validFromUtcMs,
    toUtcMs: object.validToUtcMs,
    freshUntilUtcMs: object.freshUntilUtcMs,
  };
}

const previewById = new Map<string, PreviewObject>(
  previewCatalog.map((object) => [object.id, object]),
);

export function previewPositionsAt(
  objectIds: readonly string[],
  timeUtcMs: number,
): Vector3[] {
  const cache = new Map<string, Vector3>();
  return objectIds.map((id) => previewPositionAt(id, timeUtcMs, cache));
}

export function isPreviewObjectId(id: string): boolean {
  return previewById.has(id);
}

function previewPositionAt(
  id: string,
  timeUtcMs: number,
  cache: Map<string, Vector3>,
): Vector3 {
  const cached = cache.get(id);
  if (cached) {
    return cached;
  }
  const object = previewById.get(id);
  if (!object) {
    throw new Error(`Unknown preview object: ${id}`);
  }
  if (object.orbitRadiusKm === 0) {
    const origin: Vector3 = [0, 0, 0];
    cache.set(id, origin);
    return origin;
  }

  const elapsedDays = (timeUtcMs - PREVIEW_EPOCH_UTC_MS) / 86_400_000;
  const angle =
    object.phaseRadians +
    (elapsedDays / object.orbitalPeriodDays) * Math.PI * 2;
  const local: Vector3 = [
    Math.cos(angle) * object.orbitRadiusKm,
    Math.sin(angle) * object.orbitRadiusKm,
    Math.sin(angle) *
      object.orbitRadiusKm *
      Math.sin(object.inclinationRadians),
  ];
  const parent = object.parentId
    ? previewPositionAt(object.parentId, timeUtcMs, cache)
    : ([0, 0, 0] as Vector3);
  const position: Vector3 = [
    parent[0] + local[0],
    parent[1] + local[1],
    parent[2] + local[2],
  ];
  cache.set(id, position);
  return position;
}
