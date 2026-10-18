import { useSyncExternalStore } from "react";

export interface ExplorationState {
  selectedId: string | null;
  followingId: string | null;
  focusVersion: number;
  resetVersion: number;
}

export interface ExplorationStore {
  getSnapshot(): ExplorationState;
  subscribe(listener: () => void): () => void;
  select(objectId: string): void;
  stopFollowing(): void;
  recenter(): void;
  reset(): void;
}

const initialState: ExplorationState = {
  selectedId: null,
  followingId: null,
  focusVersion: 0,
  resetVersion: 0,
};

export function createExplorationStore(): ExplorationStore {
  let state = initialState;
  const listeners = new Set<() => void>();
  const update = (next: ExplorationState): void => {
    state = next;
    listeners.forEach((listener) => listener());
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    select: (objectId) =>
      update({
        ...state,
        selectedId: objectId,
        followingId: objectId,
        focusVersion: state.focusVersion + 1,
      }),
    stopFollowing: () => update({ ...state, followingId: null }),
    recenter: () => {
      if (!state.selectedId) return;
      update({
        ...state,
        followingId: state.selectedId,
        focusVersion: state.focusVersion + 1,
      });
    },
    reset: () =>
      update({
        ...initialState,
        resetVersion: state.resetVersion + 1,
      }),
  };
}

export const explorationStore = createExplorationStore();

export function useExplorationState(): ExplorationState {
  return useSyncExternalStore(
    explorationStore.subscribe,
    explorationStore.getSnapshot,
    explorationStore.getSnapshot,
  );
}
