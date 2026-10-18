import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataStatusView } from "./DataStatusView";

afterEach(cleanup);

describe("recovery status", () => {
  it.each([
    ["shell-loading", "Loading the application shell"],
    ["scene-loading", "Loading the space scene"],
    ["segment-loading", "Loading motion segment"],
    ["empty", "No objects match"],
  ] as const)("distinguishes %s", (kind, message) => {
    render(<DataStatusView kind={kind} />);
    expect(screen.getByRole("status")).toHaveTextContent(message);
  });

  it("offers retry only for recoverable errors", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <DataStatusView
        kind="error"
        message="A motion segment could not be verified."
        onRetry={onRetry}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
