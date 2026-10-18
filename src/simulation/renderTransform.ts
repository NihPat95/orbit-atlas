import type { Vector3 } from "../domain/types";

const DEFAULT_RELATIVE_KM_PER_UNIT = 1_000_000;
const DEFAULT_ILLUSTRATIVE_KM_PER_UNIT = 100_000;

export interface RenderTransformContext {
  cameraOriginKm: Vector3;
  scaleMode: "ILLUSTRATIVE" | "RELATIVE";
  relativeKmPerUnit?: number;
  illustrativeKmPerUnit?: number;
}

export function toRenderPositionBuffer(
  positionsKm: readonly Vector3[],
  context: RenderTransformContext,
): Float32Array {
  const buffer = new Float32Array(positionsKm.length * 3);
  for (const [index, position] of positionsKm.entries()) {
    buffer.set(toRenderPosition(position, context), index * 3);
  }
  if (!Array.from(buffer).every(Number.isFinite)) {
    throw new Error("Render position buffer must remain finite");
  }
  return buffer;
}

export function toRenderPosition(
  positionKm: Vector3,
  context: RenderTransformContext,
): Vector3 {
  assertFiniteVector(positionKm, "Scientific position");
  assertFiniteVector(context.cameraOriginKm, "Camera origin");

  const relativeKmPerUnit =
    context.relativeKmPerUnit ?? DEFAULT_RELATIVE_KM_PER_UNIT;
  assertPositive(relativeKmPerUnit, "Relative scale ratio");
  const cameraRelative = subtract(positionKm, context.cameraOriginKm);

  if (context.scaleMode === "RELATIVE") {
    return cameraRelative.map(
      (coordinate) => coordinate / relativeKmPerUnit,
    ) as Vector3;
  }

  const illustrativeKmPerUnit =
    context.illustrativeKmPerUnit ?? DEFAULT_ILLUSTRATIVE_KM_PER_UNIT;
  assertPositive(illustrativeKmPerUnit, "Illustrative scale ratio");
  const distanceKm = Math.hypot(...cameraRelative);
  if (distanceKm === 0) {
    return [0, 0, 0];
  }
  const compressedDistance = Math.log1p(distanceKm / illustrativeKmPerUnit);
  const factor = compressedDistance / distanceKm;
  return cameraRelative.map((coordinate) => coordinate * factor) as Vector3;
}

export function fromRenderPosition(
  renderPosition: Vector3,
  context: RenderTransformContext,
): Vector3 {
  assertFiniteVector(renderPosition, "Render position");
  assertFiniteVector(context.cameraOriginKm, "Camera origin");
  const relativeKmPerUnit =
    context.relativeKmPerUnit ?? DEFAULT_RELATIVE_KM_PER_UNIT;
  assertPositive(relativeKmPerUnit, "Relative scale ratio");

  let cameraRelativeKm: Vector3;
  if (context.scaleMode === "RELATIVE") {
    cameraRelativeKm = renderPosition.map(
      (coordinate) => coordinate * relativeKmPerUnit,
    ) as Vector3;
  } else {
    const illustrativeKmPerUnit =
      context.illustrativeKmPerUnit ?? DEFAULT_ILLUSTRATIVE_KM_PER_UNIT;
    assertPositive(illustrativeKmPerUnit, "Illustrative scale ratio");
    const renderDistance = Math.hypot(...renderPosition);
    if (renderDistance === 0) {
      cameraRelativeKm = [0, 0, 0];
    } else {
      const distanceKm = Math.expm1(renderDistance) * illustrativeKmPerUnit;
      const factor = distanceKm / renderDistance;
      cameraRelativeKm = renderPosition.map(
        (coordinate) => coordinate * factor,
      ) as Vector3;
    }
  }

  return add(cameraRelativeKm, context.cameraOriginKm);
}

export function renderRadius(
  radiusKm: number,
  context: RenderTransformContext,
): number {
  assertPositive(radiusKm, "Scientific radius");
  const relativeKmPerUnit =
    context.relativeKmPerUnit ?? DEFAULT_RELATIVE_KM_PER_UNIT;
  assertPositive(relativeKmPerUnit, "Relative scale ratio");
  if (context.scaleMode === "RELATIVE") {
    return radiusKm / relativeKmPerUnit;
  }

  const illustrativeKmPerUnit =
    context.illustrativeKmPerUnit ?? DEFAULT_ILLUSTRATIVE_KM_PER_UNIT;
  assertPositive(illustrativeKmPerUnit, "Illustrative scale ratio");
  return Math.cbrt(radiusKm / illustrativeKmPerUnit);
}

function subtract(left: Vector3, right: Vector3): Vector3 {
  return [left[0] - right[0], left[1] - right[1], left[2] - right[2]];
}

function add(left: Vector3, right: Vector3): Vector3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function assertFiniteVector(vector: Vector3, label: string): void {
  if (!vector.every(Number.isFinite)) {
    throw new Error(`${label} must contain finite coordinates`);
  }
}

function assertPositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be finite and positive`);
  }
}
