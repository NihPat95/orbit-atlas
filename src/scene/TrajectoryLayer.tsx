import { useEffect, useMemo } from "react";
import {
  BufferGeometry,
  LineDashedMaterial,
  LineLoop,
  Vector3 as ThreeVector3,
} from "three";

import { buildPreviewTrajectory } from "./trajectory";

interface TrajectoryLayerProps {
  selectedId?: string | null;
}

export function TrajectoryLayer({ selectedId }: TrajectoryLayerProps) {
  const trajectory = useMemo(() => {
    if (!selectedId) return null;
    const points = buildPreviewTrajectory(selectedId).map(
      (point) => new ThreeVector3(...point),
    );
    if (points.length < 3) return null;
    const geometry = new BufferGeometry().setFromPoints(points);
    const material = new LineDashedMaterial({
      color: "#8ac7d1",
      dashSize: 0.12,
      gapSize: 0.09,
      opacity: 0.78,
      transparent: true,
    });
    const line = new LineLoop(geometry, material);
    line.computeLineDistances();
    return line;
  }, [selectedId]);

  useEffect(
    () => () => {
      trajectory?.geometry.dispose();
      if (Array.isArray(trajectory?.material)) {
        trajectory.material.forEach((material) => material.dispose());
      } else {
        trajectory?.material.dispose();
      }
    },
    [trajectory],
  );

  return trajectory ? <primitive object={trajectory} /> : null;
}
