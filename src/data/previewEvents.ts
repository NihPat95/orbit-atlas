import type { NotableEvent } from "../domain/types";

export const previewEvents = [
  {
    id: "earth-march-equinox",
    objectId: "earth",
    kind: "SEASONAL_MARKER",
    title: "March equinox",
    explanation:
      "A calendar marker for exploring Earth’s orbit; the preview path is illustrative.",
    occurredAtUtc: "2026-03-20T00:00:00.000Z",
  },
  {
    id: "mars-opposition-context",
    objectId: "mars",
    kind: "CLOSEST_APPROACH",
    title: "Opposition context",
    explanation:
      "A contextual marker for comparing relative positions in the preview.",
    occurredAtUtc: "2027-02-19T00:00:00.000Z",
  },
  {
    id: "iss-crew-milestone",
    objectId: "iss",
    kind: "MISSION_MILESTONE",
    title: "Continuous crew milestone",
    explanation:
      "A preview milestone inside this fixture’s motion coverage but beyond its freshness date.",
    occurredAtUtc: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "iss-first-module",
    objectId: "iss",
    kind: "LAUNCH",
    title: "First module launch",
    explanation:
      "Historical context retained outside this preview fixture’s motion coverage.",
    occurredAtUtc: "1998-11-20T00:00:00.000Z",
  },
] as const satisfies readonly NotableEvent[];
