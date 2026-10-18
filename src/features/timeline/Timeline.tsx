import { useEffect } from "react";

import {
  useSimulationClockState,
  type SimulationClock,
  type TimeValidity,
} from "../../state/simulationClock";
import type { NotableEvent } from "../../domain/types";
import { EventMarkers } from "./EventMarkers";

interface TimelineProps {
  clock: SimulationClock;
  events?: readonly NotableEvent[];
  validity: TimeValidity;
}

const speedOptions = [0.25, 1, 10, 30] as const;

export function Timeline({ clock, events = [], validity }: TimelineProps) {
  const state = useSimulationClockState(clock);

  useEffect(() => {
    clock.assess(validity);
  }, [clock, validity]);

  useEffect(() => {
    let previous = performance.now();
    const interval = window.setInterval(() => {
      const current = performance.now();
      clock.advance(current - previous, validity);
      previous = current;
    }, 120);
    return () => window.clearInterval(interval);
  }, [clock, validity]);

  const setDate = (value: string): void => {
    const parsed = Date.parse(`${value}T00:00:00.000Z`);
    if (Number.isFinite(parsed)) clock.setTime(parsed, validity);
  };

  return (
    <section aria-label="Simulation timeline" className="timeline">
      <div className="timeline__transport">
        <button
          onClick={state.isPaused ? clock.resume : clock.pause}
          type="button"
        >
          {state.isPaused ? "Resume" : "Pause"}
        </button>
        <label>
          <span>Playback speed</span>
          <select
            aria-label="Playback speed"
            onChange={(event) => clock.setSpeed(Number(event.target.value))}
            value={state.speedDaysPerSecond}
          >
            {speedOptions.map((speed) => (
              <option key={speed} value={speed}>
                {speed} day{speed === 1 ? "" : "s"}/sec
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>UTC date</span>
          <input
            aria-label="UTC date"
            max={toDateInput(validity.toUtcMs)}
            min={toDateInput(validity.fromUtcMs)}
            onChange={(event) => setDate(event.target.value)}
            type="date"
            value={toDateInput(state.timeUtcMs)}
          />
        </label>
        <strong data-testid="timeline-date">
          {formatUtcDate(state.timeUtcMs)}
        </strong>
      </div>
      <input
        aria-label="Simulation date"
        className="timeline__slider"
        max={validity.toUtcMs}
        min={validity.fromUtcMs}
        onChange={(event) =>
          clock.setTime(Number(event.target.value), validity)
        }
        step={86_400_000}
        type="range"
        value={Math.min(
          Math.max(state.timeUtcMs, validity.fromUtcMs),
          validity.toUtcMs,
        )}
      />
      <div
        aria-label="Date support"
        className={`timeline__status timeline__status--${state.dateStatus.toLocaleLowerCase()}`}
        role="status"
      >
        {state.statusMessage}
      </div>
      <EventMarkers
        events={events}
        onMoveTo={(timeUtcMs) => clock.setTime(timeUtcMs, validity)}
        validity={validity}
      />
    </section>
  );
}

function toDateInput(timeUtcMs: number): string {
  return new Date(timeUtcMs).toISOString().slice(0, 10);
}

function formatUtcDate(timeUtcMs: number): string {
  return `${new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(timeUtcMs)} UTC`;
}
