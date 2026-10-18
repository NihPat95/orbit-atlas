import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DisplayControls } from "./DisplayControls";

describe("display controls", () => {
  it("requests frame and scale changes independently", async () => {
    const user = userEvent.setup();
    const onReferenceFrameChange = vi.fn();
    const onScaleModeChange = vi.fn();
    render(
      <DisplayControls
        onReferenceFrameChange={onReferenceFrameChange}
        onScaleModeChange={onScaleModeChange}
        referenceFrame="SUN_CENTERED"
        scaleMode="ILLUSTRATIVE"
      />,
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Reference frame" }),
      "EARTH_CENTERED",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Displayed scale" }),
      "RELATIVE",
    );
    expect(onReferenceFrameChange).toHaveBeenCalledWith("EARTH_CENTERED");
    expect(onScaleModeChange).toHaveBeenCalledWith("RELATIVE");
  });
});
