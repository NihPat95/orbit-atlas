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
): Vector3[] {
  const object = previewCatalog.find(({ id }) => id === objectId);
  if (!object || sampleCount < 3) return [];
  const durationMs = object.orbitalPeriodDays * 86_400_000;
  return Array.from({ length: sampleCount }, (_, index) => {
    const timeUtcMs = centerTimeUtcMs + (durationMs * index) / sampleCount;
    const scientificPosition = previewPositionsAt([objectId], timeUtcMs)[0];
    return toRenderPosition(scientificPosition, {
      cameraOriginKm: [0, 0, 0],
      scaleMode: "ILLUSTRATIVE",
    });
  });
}
