import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./scene/OrbitScene", () => ({
  OrbitScene: () => (
    <section aria-busy="true" aria-label="Space map" role="region">
      <div role="status">Preparing the star map…</div>
    </section>
  ),
}));

import { App } from "./App";

describe("App", () => {
  it("renders a loading-safe application frame", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Orbit Atlas" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Preparing the star map",
    );
    expect(
      screen.getByRole("complementary", { name: "Object catalog" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Space map" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(
      screen.getByRole("complementary", { name: "Object details" }),
    ).toBeInTheDocument();
  });
});
