import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Camera } from "three";

import {
  PREVIEW_DATASET_VERSION,
  PREVIEW_EPOCH_UTC_MS,
  previewCatalog,
} from "../data/previewCatalog";
import { SimulationWorkerClient } from "../worker/client";
import {
  CameraController,
  type CameraControllerHandle,
} from "./CameraController";
import { ObjectLayer } from "./ObjectLayer";
import { SceneLabels } from "./SceneLabels";

interface OrbitSceneProps {
  followingId?: string | null;
  focusVersion?: number;
  onSelect?: (objectId: string) => void;
  resetVersion?: number;
  selectedId?: string | null;
}

const SIMULATED_DAYS_PER_REAL_SECOND = 0.25;

export function OrbitScene({
  followingId,
  focusVersion,
  onSelect,
  resetVersion,
  selectedId,
}: OrbitSceneProps) {
  const objects = previewCatalog;
  const positionsRef = useRef<Float32Array<ArrayBufferLike>>(
    new Float32Array(objects.length * 3),
  );
  const controlsRef = useRef<CameraControllerHandle>(null);
  const [sceneCamera, setSceneCamera] = useState<Camera | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const objectIds = useMemo(
    () => objects.map((object) => object.id),
    [objects],
  );
  const handleSelect = (objectId: string): void => {
    onSelect?.(objectId);
  };

  useEffect(() => {
    let hasReceivedPositions = false;
    const worker = new Worker(
      new URL("../worker/simulation.worker.ts", import.meta.url),
      { type: "module" },
    );
    const client = new SimulationWorkerClient(worker);
    const unsubscribe = client.subscribe((response) => {
      if (response.type === "positions") {
        positionsRef.current = response.positions;
        if (!hasReceivedPositions) {
          hasReceivedPositions = true;
          setStatus("ready");
        }
      } else if (response.type === "error") {
        setStatus("error");
      }
    });
    client.initialize({
      baseUrl: new URL(import.meta.env.BASE_URL, window.location.href).href,
      datasetVersion: PREVIEW_DATASET_VERSION,
      objectIds,
    });

    const startedAt = performance.now();
    const tick = window.setInterval(() => {
      const elapsedSeconds = (performance.now() - startedAt) / 1_000;
      client.setTime(
        Math.round(
          PREVIEW_EPOCH_UTC_MS +
            elapsedSeconds * SIMULATED_DAYS_PER_REAL_SECOND * 86_400_000,
        ),
      );
    }, 120);

    return () => {
      window.clearInterval(tick);
      unsubscribe();
      client.dispose();
    };
  }, [objectIds]);

  return (
    <div
      aria-busy={status === "loading"}
      aria-label="Space map"
      className="scene-frame"
      role="region"
    >
      <div className="scene-meta scene-meta--left">
        <span>Sun-centered</span>
        <span>Illustrative scale</span>
      </div>
      <div className="scene-meta scene-meta--right">
        <span className="coordinate-readout">Preview fixtures · ICRF-like</span>
      </div>

      <Canvas
        camera={{ fov: 45, near: 0.01, far: 300, position: [0, 8, 18] }}
        data-testid="orbit-scene"
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ camera }) => setSceneCamera(camera)}
      >
        <color args={["#05090c"]} attach="background" />
        {[6.4, 7, 7.5, 7.9, 9, 9.6].map((radius) => (
          <mesh key={radius} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius, 0.006, 4, 128]} />
            <meshBasicMaterial color="#24414a" transparent opacity={0.42} />
          </mesh>
        ))}
        <ObjectLayer
          objects={objects}
          onSelect={handleSelect}
          positionsRef={positionsRef}
          selectedId={selectedId}
        />
        <CameraController
          focusVersion={focusVersion}
          followingId={followingId}
          objectIds={objectIds}
          positionsRef={positionsRef}
          ref={controlsRef}
          resetVersion={resetVersion}
        />
      </Canvas>

      {sceneCamera ? (
        <SceneLabels
          camera={sceneCamera}
          objects={objects}
          onSelect={handleSelect}
          positionsRef={positionsRef}
          selectedId={selectedId}
        />
      ) : null}
      <div aria-live="polite" className="scene-status" role="status">
        {status === "loading" ? "Preparing the star map…" : null}
        {status === "error"
          ? "The preview motion stream could not be started."
          : null}
      </div>
      <div className="scene-actions">
        <span>
          Drag to orbit · Right-drag to pan · Scroll to zoom · WASD to travel
        </span>
        <button onClick={() => controlsRef.current?.reset()} type="button">
          Reset view
        </button>
      </div>
    </div>
  );
}
