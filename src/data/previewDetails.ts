export interface PreviewDetails {
  summary: string;
  facts: readonly string[];
  confidence: "Low" | "Medium";
  sourceEpochUtc: string;
  limitations: string;
}

const detailsById: Record<string, PreviewDetails> = {
  sun: {
    summary: "The star whose gravity organizes the solar system.",
    facts: ["Shown at the origin in the Sun-centered frame."],
    confidence: "Medium",
    sourceEpochUtc: "2026-01-01T00:00:00.000Z",
    limitations:
      "Preview motion is fixed at the origin and is not a barycentric solution.",
  },
  mercury: {
    summary: "The innermost planet and the fastest traveler around the Sun.",
    facts: ["One preview revolution takes about 88 days."],
    confidence: "Low",
    sourceEpochUtc: "2026-01-01T00:00:00.000Z",
    limitations:
      "The preview uses a circular guide instead of an authoritative ephemeris.",
  },
  venus: {
    summary: "A cloud-covered terrestrial planet with an orbit inside Earth’s.",
    facts: [
      "The preview emphasizes orbital relationships, not surface appearance.",
    ],
    confidence: "Low",
    sourceEpochUtc: "2026-01-01T00:00:00.000Z",
    limitations:
      "Orbital eccentricity and perturbations are omitted from the preview.",
  },
  earth: {
    summary:
      "Our home planet, used here as both an object and a reference-frame origin.",
    facts: [
      "Its preview year is 365.256 days.",
      "The Moon is modeled relative to Earth.",
    ],
    confidence: "Low",
    sourceEpochUtc: "2026-01-01T00:00:00.000Z",
    limitations:
      "This circular preview is educational and must not be used for navigation.",
  },
  moon: {
    summary:
      "Earth’s natural satellite, shown moving around its parent planet.",
    facts: ["Its preview period is about 27.3 days."],
    confidence: "Low",
    sourceEpochUtc: "2026-01-01T00:00:00.000Z",
    limitations:
      "The lunar orbit is simplified and does not include solar perturbations.",
  },
  mars: {
    summary: "A smaller terrestrial world moving beyond Earth’s orbit.",
    facts: ["Its preview year is about 687 days."],
    confidence: "Low",
    sourceEpochUtc: "2026-01-01T00:00:00.000Z",
    limitations:
      "The guide omits eccentricity, precession, and planetary perturbations.",
  },
  jupiter: {
    summary:
      "The largest planet, traveling on a much wider path than the inner worlds.",
    facts: ["Illustrative scale compresses its displayed distance."],
    confidence: "Low",
    sourceEpochUtc: "2026-01-01T00:00:00.000Z",
    limitations:
      "Size and distance are independently stylized in illustrative mode.",
  },
  saturn: {
    summary:
      "A ringed giant whose long orbit helps reveal the scale of the solar system.",
    facts: ["Its preview year is roughly 29.5 Earth years."],
    confidence: "Low",
    sourceEpochUtc: "2026-01-01T00:00:00.000Z",
    limitations:
      "Rings and perturbations are deferred; the orbit is a sampled guide.",
  },
  iss: {
    summary:
      "A crewed laboratory in low Earth orbit, represented by a short-lived fixture.",
    facts: [
      "Element data ages quickly and becomes stale after 15 January 2026.",
    ],
    confidence: "Low",
    sourceEpochUtc: "2026-01-01T00:00:00.000Z",
    limitations:
      "This is not a live element set and is unsuitable for passes or tracking.",
  },
};

export function previewDetailsFor(objectId: string): PreviewDetails {
  const details = detailsById[objectId];
  if (!details) throw new Error(`Missing preview details for ${objectId}`);
  return details;
}
