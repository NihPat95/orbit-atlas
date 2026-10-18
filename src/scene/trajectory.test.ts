import { describe, expect, it } from "vitest";

import { PREVIEW_EPOCH_UTC_MS } from "../data/previewCatalog";
import { buildPreviewTrajectory } from "./trajectory";

describe("selected trajectory", () => {
  it("builds a finite sampled guide without changing the current state", () => {
    const points = buildPreviewTrajectory("earth", PREVIEW_EPOCH_UTC_MS, 48);
    expect(points).toHaveLength(48);
    expect(points.flat().every(Number.isFinite)).toBe(true);
    expect(points[0]).not.toEqual(points[12]);
  });
});
