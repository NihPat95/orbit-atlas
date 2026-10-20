import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { previewCatalog } from "../../data/previewCatalog";
import { ObjectDetails } from "./ObjectDetails";

describe("object details", () => {
  it("puts the plain-language summary before optional technical disclosure", async () => {
    const user = userEvent.setup();
    const earth = previewCatalog.find(({ id }) => id === "earth");
    if (!earth) throw new Error("Earth preview record is required");
    render(
      <ObjectDetails
        following
        object={earth}
        referenceFrame="SUN_CENTERED"
        scaleMode="ILLUSTRATIVE"
        timeUtcMs={Date.UTC(2026, 0, 10)}
      />,
    );

    const summary = screen.getByTestId("plain-summary");
    const disclosure = screen.getByText("Technical and orbital details");
    expect(
      summary.compareDocumentPosition(disclosure) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    await user.click(disclosure);
    expect(screen.getByText("Confidence")).toBeVisible();
    expect(screen.getByText("Source epoch")).toBeVisible();
    expect(screen.getByText("Limitations")).toBeVisible();
    expect(screen.getByText("Sun-centered")).toBeVisible();
    expect(screen.getByText("Illustrative")).toBeVisible();
  });
});
