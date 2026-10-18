import { describe, expect, it } from "vitest";

import { createExplorationStore } from "./explorationStore";

describe("selection and follow state", () => {
  it("selects and follows, then stops and recenters deterministically", () => {
    const store = createExplorationStore();
    store.select("earth");
    expect(store.getSnapshot()).toMatchObject({
      selectedId: "earth",
      followingId: "earth",
      focusVersion: 1,
    });

    store.stopFollowing();
    expect(store.getSnapshot().followingId).toBeNull();
    store.recenter();
    expect(store.getSnapshot()).toMatchObject({
      selectedId: "earth",
      followingId: "earth",
      focusVersion: 2,
    });

    store.select("mars");
    expect(store.getSnapshot()).toMatchObject({
      selectedId: "mars",
      followingId: "mars",
      focusVersion: 3,
    });
    store.reset();
    expect(store.getSnapshot()).toMatchObject({
      selectedId: null,
      followingId: null,
      resetVersion: 1,
    });
  });
});
