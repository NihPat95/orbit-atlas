import type { DatasetCatalog, SpaceObject } from "../domain/types";
import type { PreviewObject } from "./previewCatalog";

const colors: Record<SpaceObject["category"], string> = {
  STAR: "#f2c46f",
  PLANET: "#71b8c6",
  MOON: "#d6d8d0",
  DWARF_PLANET: "#b9ada0",
  COMET: "#9adbe8",
  SPACECRAFT: "#ef8f64",
  SATELLITE: "#eef5f6",
  TELESCOPE: "#d8b4fe",
};

export function toRuntimeObjects(catalog: DatasetCatalog): PreviewObject[] {
  return catalog.objects.map(toRuntimeObject);
}

function toRuntimeObject(object: SpaceObject): PreviewObject {
  const sourceEpochUtc =
    object.motion.kind === "SATELLITE_OMM"
      ? object.validity.startUtc
      : object.motion.segments[0]?.startUtc;
  return {
    id: object.id,
    canonicalName: object.canonicalName,
    alternateNames: object.alternateNames,
    category: object.category,
    color: colors[object.category],
    radiusKm: object.scale.radiusKm,
    orbitRadiusKm: 0,
    orbitalPeriodDays: 1,
    phaseRadians: 0,
    inclinationRadians: 0,
    validFromUtcMs: Date.parse(object.validity.startUtc),
    validToUtcMs: Date.parse(object.validity.endUtc),
    summary: object.summary,
    facts: [object.details],
    confidence: `${object.confidence.level}: ${object.confidence.summary}`,
    sourceEpochUtc,
    limitations: object.limitations.join(" "),
  };
}
