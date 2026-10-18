import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EventMarkers } from "./EventMarkers";

const events = [
  {
    id: "iss-crew-milestone",
    objectId: "iss",
    title: "Continuous crew milestone",
    explanation: "A preview timeline event.",
    occurredAtUtc: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "iss-first-module",
    objectId: "iss",
    title: "First module launch",
    explanation: "Historical context before preview motion coverage.",
    occurredAtUtc: "1998-11-20T00:00:00.000Z",
  },
];

describe("timeline events", () => {
  it("moves to supported events and leaves outside-coverage events as context", async () => {
    const user = userEvent.setup();
    const onMoveTo = vi.fn();
    render(
      <EventMarkers
        events={events}
        onMoveTo={onMoveTo}
        validity={{
          fromUtcMs: Date.UTC(2025, 0, 1),
          toUtcMs: Date.UTC(2027, 11, 31),
        }}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /continuous crew milestone/i }),
    );
    expect(onMoveTo).toHaveBeenCalledWith(Date.UTC(2026, 5, 1));

    const contextEvent = screen.getByRole("button", {
      name: /first module launch/i,
    });
    expect(contextEvent).toBeDisabled();
    expect(contextEvent).toHaveAccessibleDescription(
      /outside motion coverage/i,
    );
  });
});
