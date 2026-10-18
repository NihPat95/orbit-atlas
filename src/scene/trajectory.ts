import {
  PREVIEW_EPOCH_UTC_MS,
  previewCatalog,
  previewPositionsAt,
} from "../data/previewCatalog";
import type { Vector3 } from "../domain/types";
import { toRenderPosition } from "../simulation/renderTransform";

export function buildPreviewTrajectory(
  objectId: string,
  centerTimeUtcMs = PREVIEW_EPOCH_UTC_MS,
  sampleCount = 96,
  referenceFrame: "SUN_CENTERED" | "EARTH_CENTERED" = "SUN_CENTERED",
  scaleMode: "ILLUSTRATIVE" | "RELATIVE" = "ILLUSTRATIVE",
): Vector3[] {
  const object = previewCatalog.find(({ id }) => id === objectId);
  if (!object || sampleCount < 3) return [];
  const durationMs = object.orbitalPeriodDays * 86_400_000;
  return Array.from({ length: sampleCount }, (_, index) => {
    const timeUtcMs = centerTimeUtcMs + (durationMs * index) / sampleCount;
    const [scientificPosition, earthPosition] = previewPositionsAt(
      [objectId, "earth"],
      timeUtcMs,
    );
    const framedPosition: Vector3 =
      referenceFrame === "EARTH_CENTERED"
        ? [
            scientificPosition[0] - earthPosition[0],
            scientificPosition[1] - earthPosition[1],
            scientificPosition[2] - earthPosition[2],
          ]
        : scientificPosition;
    return toRenderPosition(framedPosition, {
      cameraOriginKm: [0, 0, 0],
      scaleMode,
    });
  });
}
