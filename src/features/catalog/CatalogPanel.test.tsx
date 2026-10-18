import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { previewCatalog } from "../../data/previewCatalog";
import { CatalogPanel } from "./CatalogPanel";
import { searchCatalog } from "./search";

describe("catalog discovery", () => {
  it("searches canonical and alternate names case-insensitively", () => {
    expect(searchCatalog(previewCatalog, "terra").map(({ id }) => id)).toEqual([
      "earth",
    ]);
    expect(
      searchCatalog(previewCatalog, "RED PLANET").map(({ id }) => id),
    ).toEqual(["mars"]);
  });

  it("browses categories and selects a result", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <CatalogPanel
        objects={previewCatalog}
        onSelect={onSelect}
        selectedId={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: /moons/i }));
    expect(
      screen.getByRole("button", { name: "Moon, Moon" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /mars/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /all objects/i }));
    await user.type(screen.getByRole("searchbox"), "terra");
    await user.click(screen.getByRole("button", { name: "Earth, Planet" }));
    expect(onSelect).toHaveBeenCalledWith("earth");
  });
});
