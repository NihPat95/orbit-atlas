import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Camera } from "three";
import type {
  ReferenceFrame,
  ScaleMode,
} from "../features/display/DisplayControls";

import {
  PREVIEW_DATASET_VERSION,
  PREVIEW_EPOCH_UTC_MS,
  previewCatalog,
} from "../data/previewCatalog";
import { SimulationWorkerClient } from "../worker/client";
import type { PreviewObject } from "../data/previewCatalog";
import { DataStatusView } from "../features/status/DataStatusView";
import {
  CameraController,
  type CameraControllerHandle,
} from "./CameraController";
import { ObjectLayer } from "./ObjectLayer";
import { SceneLabels } from "./SceneLabels";
import { TrajectoryLayer } from "./TrajectoryLayer";
import { WebGLBoundary } from "./WebGLBoundary";

interface OrbitSceneProps {
  datasetVersion?: string;
  followingId?: string | null;
  focusVersion?: number;
  onSelect?: (objectId: string) => void;
  objects?: readonly PreviewObject[];
  referenceFrame?: ReferenceFrame;
  resetVersion?: number;
  scaleMode?: ScaleMode;
  selectedId?: string | null;
  timeIsSupported?: boolean;
  timeUtcMs?: number;
}

export function OrbitScene({ ...props }: OrbitSceneProps) {
  return (
    <WebGLBoundary>
      <OrbitSceneContent {...props} />
    </WebGLBoundary>
  );
}

function OrbitSceneContent({
  datasetVersion = PREVIEW_DATASET_VERSION,
  followingId,
  focusVersion,
  onSelect,
  objects = previewCatalog,
  referenceFrame = "SUN_CENTERED",
  resetVersion,
  scaleMode = "ILLUSTRATIVE",
  selectedId,
  timeIsSupported = true,
  timeUtcMs = PREVIEW_EPOCH_UTC_MS,
}: OrbitSceneProps) {
  const positionsRef = useRef<Float32Array<ArrayBufferLike>>(
    new Float32Array(objects.length * 3),
  );
  const controlsRef = useRef<CameraControllerHandle>(null);
  const clientRef = useRef<SimulationWorkerClient | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const [sceneCamera, setSceneCamera] = useState<Camera | null>(null);
  const [status, setStatus] = useState<
    "loading" | "segment-loading" | "ready" | "error"
  >("loading");
  const objectIds = useMemo(
    () => objects.map((object) => object.id),
    [objects],
  );
  const handleSelect = (objectId: string): void => {
    setStatus("segment-loading");
    onSelect?.(objectId);
  };

  useEffect(() => {
    const worker = new Worker(
      new URL("../worker/simulation.worker.ts", import.meta.url),
      { type: "module" },
    );
    const client = new SimulationWorkerClient(worker);
    clientRef.current = client;
    const unsubscribe = client.subscribe((response) => {
      if (response.type === "positions") {
        positionsRef.current = response.positions;
        setStatus("ready");
      } else if (response.type === "error") {
        setStatus("error");
      }
    });
    client.initialize({
      baseUrl: new URL(import.meta.env.BASE_URL, window.location.href).href,
      datasetVersion,
      objectIds,
    });
    return () => {
      unsubscribe();
      client.dispose();
      clientRef.current = null;
    };
  }, [datasetVersion, objectIds, retryVersion]);

  useEffect(() => {
    if (timeIsSupported) clientRef.current?.setTime(timeUtcMs);
  }, [timeIsSupported, timeUtcMs]);

  useEffect(() => {
    clientRef.current?.setReferenceFrame(referenceFrame);
  }, [referenceFrame]);

  useEffect(() => {
    clientRef.current?.setRenderContext([0, 0, 0], scaleMode);
  }, [scaleMode]);

  return (
    <div
      aria-busy={status === "loading" || status === "segment-loading"}
      aria-label="Space map"
      className="scene-frame"
      role="region"
    >
      <div className="scene-meta scene-meta--left">
        <span>
          {referenceFrame === "SUN_CENTERED"
            ? "Sun-centered"
            : "Earth-centered"}
        </span>
        <span>
          {scaleMode === "ILLUSTRATIVE" ? "Illustrative" : "Relative"} scale
        </span>
      </div>
      <div className="scene-meta scene-meta--right">
        <span className="coordinate-readout">
          Versioned provider data · ICRF/J2000
        </span>
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
        <TrajectoryLayer
          referenceFrame={referenceFrame}
          scaleMode={scaleMode}
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
      {selectedId ? (
        <div className="trajectory-legend">Approximate educational path</div>
      ) : null}
      <div aria-live="polite" className="scene-status">
        {status === "loading" ? <DataStatusView kind="scene-loading" /> : null}
        {status === "segment-loading" ? (
          <DataStatusView kind="segment-loading" />
        ) : null}
        {status === "error" ? (
          <DataStatusView
            kind="error"
            message="The versioned motion stream could not be started."
            onRetry={() => {
              setStatus("loading");
              setRetryVersion((version) => version + 1);
            }}
          />
        ) : null}
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
