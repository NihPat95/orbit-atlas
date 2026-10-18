import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, InstancedMesh, Object3D } from "three";

import type { PreviewObject } from "../data/previewCatalog";

interface ObjectLayerProps {
  objects: readonly PreviewObject[];
  positionsRef: MutableRefObject<Float32Array<ArrayBufferLike>>;
  onSelect?: (objectId: string) => void;
  selectedId?: string | null;
}

export function ObjectLayer({
  objects,
  positionsRef,
  onSelect,
  selectedId,
}: ObjectLayerProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const transform = useMemo(() => new Object3D(), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    objects.forEach((object, index) => {
      mesh.setColorAt(index, new Color(object.color));
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [objects]);

  useFrame(() => {
    const mesh = meshRef.current;
    const positions = positionsRef.current;
    if (!mesh || positions.length !== objects.length * 3) return;

    objects.forEach((object, index) => {
      transform.position.fromArray(positions, index * 3);
      const baseScale = object.category === "STAR" ? 0.52 : 0.2;
      const scale = object.id === selectedId ? baseScale * 1.65 : baseScale;
      transform.scale.setScalar(scale);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      args={[undefined, undefined, objects.length]}
      frustumCulled={false}
      onPointerDown={(event) => {
        event.stopPropagation();
        if (event.instanceId !== undefined) {
          onSelect?.(objects[event.instanceId].id);
        }
      }}
      ref={meshRef}
    >
      <sphereGeometry args={[1, 20, 20]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
