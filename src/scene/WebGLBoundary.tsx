import { useState, type ReactNode } from "react";

interface WebGLBoundaryProps {
  children: ReactNode;
  supportsWebGL2?: () => boolean;
}

export function WebGLBoundary({
  children,
  supportsWebGL2 = detectWebGL2,
}: WebGLBoundaryProps) {
  const [isSupported] = useState(supportsWebGL2);
  if (!isSupported) {
    return (
      <section aria-label="Space map" className="scene-frame webgl-fallback">
        <div role="alert">
          <strong>WebGL 2 is unavailable</strong>
          <p>
            Orbit Atlas needs WebGL 2 to draw the interactive map. The catalog
            and educational details remain available.
          </p>
        </div>
      </section>
    );
  }
  return children;
}

function detectWebGL2(): boolean {
  if (typeof document === "undefined") return false;
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}
