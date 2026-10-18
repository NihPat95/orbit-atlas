const checksumA = `sha256:${"a".repeat(64)}`;
const checksumB = `sha256:${"b".repeat(64)}`;
const checksumC = `sha256:${"c".repeat(64)}`;

export const validDatasetSnapshot = {
  manifest: {
    schemaVersion: 1,
    datasetVersion: "demo-2026",
    generatedAt: "2026-10-17T20:00:00.000Z",
    sources: [
      {
        id: "jpl-horizons",
        provider: "JPL_HORIZONS",
        retrievedAt: "2026-10-17T19:00:00.000Z",
        sourceEpoch: "2026-10-17T00:00:00.000Z",
        checksum: checksumA,
        attribution: "NASA/JPL Horizons",
        sourceUrl: "https://ssd.jpl.nasa.gov/horizons/",
      },
    ],
    assets: {
      catalog: {
        path: "data/demo-2026/catalog.json",
        checksum: checksumB,
        bytes: 2048,
      },
      motion: [
        {
          path: "data/demo-2026/motion/earth/2026.json",
          checksum: checksumC,
          bytes: 4096,
        },
      ],
    },
  },
  catalog: {
    schemaVersion: 1,
    datasetVersion: "demo-2026",
    objects: [
      {
        id: "earth",
        canonicalName: "Earth",
        alternateNames: ["Terra"],
        category: "PLANET",
        summary: "Our home planet moves around the Sun once each year.",
        details: "Earth is the reference point for Earth-centered views.",
        defaultReferenceFrame: "SUN_CENTERED",
        scale: {
          radiusKm: 6371,
          illustrativeRadius: 1,
        },
        confidence: {
          level: "HIGH",
          summary: "Position is derived from JPL ephemeris samples.",
        },
        limitations: [
          "This educational position is not suitable for navigation.",
        ],
        validity: {
          startUtc: "1900-01-01T00:00:00.000Z",
          endUtc: "2100-12-31T23:59:59.000Z",
        },
        sourceIds: ["jpl-horizons"],
        motion: {
          kind: "EPHEMERIS",
          frame: "ICRF_J2000",
          timeSystem: "UTC",
          segments: [
            {
              id: "2026",
              path: "data/demo-2026/motion/earth/2026.json",
              checksum: checksumC,
              startUtc: "2026-01-01T00:00:00.000Z",
              endUtc: "2026-12-31T23:59:59.000Z",
            },
          ],
        },
      },
    ],
    events: [
      {
        id: "earth-october-equinox",
        objectId: "earth",
        kind: "SEASONAL_MARKER",
        title: "October equinox reference",
        explanation: "A reference event used to verify catalog relationships.",
        occurredAtUtc: "2026-09-23T00:00:00.000Z",
      },
    ],
  },
};

export const validEphemerisSeries = {
  schemaVersion: 1,
  objectId: "earth",
  segmentId: "2026",
  frame: "ICRF_J2000",
  timeSystem: "UTC",
  startUtc: "2026-01-01T00:00:00.000Z",
  endUtc: "2026-01-02T00:00:00.000Z",
  samples: [
    {
      epochUtc: "2026-01-01T00:00:00.000Z",
      positionKm: [149_597_870.7, 0, 0],
      velocityKmPerSecond: [0, 29.78, 0],
    },
    {
      epochUtc: "2026-01-02T00:00:00.000Z",
      positionKm: [149_575_000, 2_572_000, 0],
      velocityKmPerSecond: [-0.51, 29.77, 0],
    },
  ],
};
