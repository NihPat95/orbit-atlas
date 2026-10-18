import { useEffect, useRef, type MutableRefObject } from "react";
import { Camera, Vector3 } from "three";

import type { PreviewObject } from "../data/previewCatalog";

interface SceneLabelsProps {
  camera: Camera;
  objects: readonly PreviewObject[];
  positionsRef: MutableRefObject<Float32Array<ArrayBufferLike>>;
  onSelect?: (objectId: string) => void;
  selectedId?: string | null;
}

export function SceneLabels({
  camera,
  objects,
  positionsRef,
  onSelect,
  selectedId,
}: SceneLabelsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const projected = new Vector3();
    let animationFrame = 0;
    const update = (): void => {
      const root = rootRef.current;
      const positions = positionsRef.current;
      if (root && positions.length === objects.length * 3) {
        objects.forEach((_object, index) => {
          const label = labelRefs.current[index];
          if (!label) return;
          projected.fromArray(positions, index * 3).project(camera);
          const isVisible =
            projected.z > -1 &&
            projected.z < 1 &&
            Math.abs(projected.x) < 1.15 &&
            Math.abs(projected.y) < 1.15;
          label.hidden = !isVisible;
          label.style.transform = `translate3d(${(projected.x * 0.5 + 0.5) * root.clientWidth}px, ${(-projected.y * 0.5 + 0.5) * root.clientHeight}px, 0)`;
        });
      }
      animationFrame = requestAnimationFrame(update);
    };
    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, [camera, objects, positionsRef]);

  return (
    <div aria-label="Object labels" className="scene-labels" ref={rootRef}>
      {objects.map((object, index) => (
        <button
          aria-pressed={selectedId === object.id}
          className="scene-label"
          key={object.id}
          onClick={() => onSelect?.(object.id)}
          ref={(node) => {
            labelRefs.current[index] = node;
          }}
          type="button"
        >
          {object.canonicalName}
        </button>
      ))}
    </div>
  );
}
