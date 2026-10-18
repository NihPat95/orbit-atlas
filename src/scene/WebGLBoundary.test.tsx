import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WebGLBoundary } from "./WebGLBoundary";

describe("WebGL boundary", () => {
  it("shows an explanation without mounting the scene when WebGL 2 is missing", () => {
    render(
      <WebGLBoundary supportsWebGL2={() => false}>
        <canvas data-testid="scene-canvas" />
      </WebGLBoundary>,
    );
    expect(screen.queryByTestId("scene-canvas")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "WebGL 2 is unavailable",
    );
  });
});
