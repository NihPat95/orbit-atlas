import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
