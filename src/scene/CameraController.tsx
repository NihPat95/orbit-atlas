import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Vector3 } from "three";

export interface CameraControllerHandle {
  reset(): void;
}

const DEFAULT_CAMERA_POSITION = new Vector3(0, 8, 18);
const DEFAULT_TARGET = new Vector3(0, 0, 0);

export const CameraController = forwardRef<CameraControllerHandle>(
  function CameraController(_props, ref) {
    const { camera, gl } = useThree();
    const controlsRef = useRef<OrbitControls | null>(null);

    useEffect(() => {
      const controls = new OrbitControls(camera, gl.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.075;
      controls.enablePan = true;
      controls.minDistance = 0.6;
      controls.maxDistance = 120;
      controls.target.copy(DEFAULT_TARGET);
      controls.update();
      controlsRef.current = controls;

      const handleKeyDown = (event: KeyboardEvent): void => {
        if (event.target instanceof HTMLInputElement) {
          return;
        }
        const offset = new Vector3();
        const distance = Math.max(
          camera.position.distanceTo(controls.target),
          1,
        );
        const step = distance * 0.04;
        if (event.key === "w" || event.key === "ArrowUp") offset.z = -step;
        if (event.key === "s" || event.key === "ArrowDown") offset.z = step;
        if (event.key === "a" || event.key === "ArrowLeft") offset.x = -step;
        if (event.key === "d" || event.key === "ArrowRight") offset.x = step;
        if (offset.lengthSq() === 0) return;
        camera.position.add(offset);
        controls.target.add(offset);
        controls.update();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        controls.dispose();
        controlsRef.current = null;
      };
    }, [camera, gl]);

    useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          camera.position.copy(DEFAULT_CAMERA_POSITION);
          camera.up.set(0, 1, 0);
          controlsRef.current?.target.copy(DEFAULT_TARGET);
          controlsRef.current?.update();
        },
      }),
      [camera],
    );

    useFrame(() => controlsRef.current?.update());
    return null;
  },
);
