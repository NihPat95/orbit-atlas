import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Timeline } from "./Timeline";
import { createSimulationClock } from "../../state/simulationClock";

const validity = {
  fromUtcMs: Date.UTC(2025, 0, 1),
  toUtcMs: Date.UTC(2027, 11, 31),
  freshUntilUtcMs: Date.UTC(2026, 0, 15),
};

describe("timeline controls", () => {
  it("pauses, resumes, changes speed, and sets a direct UTC date", async () => {
    const user = userEvent.setup();
    const clock = createSimulationClock();
    render(<Timeline clock={clock} validity={validity} />);

    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(clock.getSnapshot().isPaused).toBe(true);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Playback speed" }),
      "10",
    );
    expect(clock.getSnapshot().speedDaysPerSecond).toBe(10);
    await user.click(screen.getByRole("button", { name: "Resume" }));
    expect(clock.getSnapshot().isPaused).toBe(false);

    await user.click(screen.getByRole("button", { name: "Pause" }));
    fireEvent.change(screen.getByLabelText("UTC date"), {
      target: { value: "2026-01-10" },
    });
    expect(new Date(clock.getSnapshot().timeUtcMs).toISOString()).toContain(
      "2026-01-10",
    );
  });

  it("keeps the last defensible time for unsupported dates and reports staleness", () => {
    const clock = createSimulationClock();
    const initialTime = clock.getSnapshot().timeUtcMs;
    clock.setTime(Date.UTC(2030, 0, 1), validity);
    expect(clock.getSnapshot()).toMatchObject({
      timeUtcMs: initialTime,
      dateStatus: "UNSUPPORTED",
    });

    clock.setTime(Date.UTC(2026, 1, 1), validity);
    expect(clock.getSnapshot()).toMatchObject({
      timeUtcMs: Date.UTC(2026, 1, 1),
      dateStatus: "STALE",
    });
  });
});
