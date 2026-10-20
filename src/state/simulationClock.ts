import { useSyncExternalStore } from "react";

export type DateStatus = "APPROXIMATE" | "STALE" | "UNSUPPORTED";

export interface TimeValidity {
  fromUtcMs: number;
  toUtcMs: number;
  freshUntilUtcMs?: number;
}

export interface SimulationClockState {
  timeUtcMs: number;
  isPaused: boolean;
  speedDaysPerSecond: number;
  dateStatus: DateStatus;
  statusMessage: string;
  revision: number;
}

export interface SimulationClock {
  getSnapshot(): SimulationClockState;
  subscribe(listener: () => void): () => void;
  pause(): void;
  resume(): void;
  setSpeed(speedDaysPerSecond: number): void;
  setTime(timeUtcMs: number, validity: TimeValidity): boolean;
  assess(validity: TimeValidity): void;
  advance(elapsedRealMs: number, validity: TimeValidity): void;
}

const initialState: SimulationClockState = {
  timeUtcMs: Date.UTC(2026, 9, 18),
  isPaused: false,
  speedDaysPerSecond: 1,
  dateStatus: "APPROXIMATE",
  statusMessage: "Provider-backed positions are approximate educational data.",
  revision: 0,
};

export function createSimulationClock(): SimulationClock {
  let state = initialState;
  const listeners = new Set<() => void>();
  const update = (next: SimulationClockState): void => {
    state = next;
    listeners.forEach((listener) => listener());
  };
  const assessTime = (
    timeUtcMs: number,
    validity: TimeValidity,
  ): Pick<SimulationClockState, "dateStatus" | "statusMessage"> => {
    if (timeUtcMs < validity.fromUtcMs || timeUtcMs > validity.toUtcMs) {
      return {
        dateStatus: "UNSUPPORTED",
        statusMessage:
          "This date is unsupported for the selected object; its last defensible position is retained.",
      };
    }
    if (validity.freshUntilUtcMs && timeUtcMs > validity.freshUntilUtcMs) {
      return {
        dateStatus: "STALE",
        statusMessage:
          "The selected element set is stale at this date; its position is shown with reduced confidence.",
      };
    }
    return {
      dateStatus: "APPROXIMATE",
      statusMessage:
        "Provider-backed positions are approximate educational data.",
    };
  };
  const setTime = (timeUtcMs: number, validity: TimeValidity): boolean => {
    if (!Number.isSafeInteger(timeUtcMs)) return false;
    const assessment = assessTime(timeUtcMs, validity);
    if (assessment.dateStatus === "UNSUPPORTED") {
      update({ ...state, ...assessment, revision: state.revision + 1 });
      return false;
    }
    update({
      ...state,
      ...assessment,
      timeUtcMs,
      revision: state.revision + 1,
    });
    return true;
  };

  return {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    pause: () => update({ ...state, isPaused: true }),
    resume: () => update({ ...state, isPaused: false }),
    setSpeed: (speedDaysPerSecond) => {
      if (!Number.isFinite(speedDaysPerSecond) || speedDaysPerSecond <= 0)
        return;
      update({ ...state, speedDaysPerSecond });
    },
    setTime,
    assess: (validity) => {
      const assessment = assessTime(state.timeUtcMs, validity);
      if (
        assessment.dateStatus !== state.dateStatus ||
        assessment.statusMessage !== state.statusMessage
      ) {
        update({ ...state, ...assessment, revision: state.revision + 1 });
      }
    },
    advance: (elapsedRealMs, validity) => {
      if (
        state.isPaused ||
        !Number.isFinite(elapsedRealMs) ||
        elapsedRealMs <= 0
      ) {
        return;
      }
      const elapsedSimulationMs =
        elapsedRealMs * state.speedDaysPerSecond * 86_400;
      setTime(Math.round(state.timeUtcMs + elapsedSimulationMs), validity);
    },
  };
}

export const simulationClock = createSimulationClock();

export function useSimulationClockState(
  clock: SimulationClock = simulationClock,
): SimulationClockState {
  return useSyncExternalStore(
    clock.subscribe,
    clock.getSnapshot,
    clock.getSnapshot,
  );
}
