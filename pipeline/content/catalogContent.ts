import type { NotableEvent, SpaceObject } from "../../src/domain/types";

const placeholderChecksum = `sha256:${"0".repeat(64)}`;
const naturalValidity = {
  startUtc: "1900-01-01T00:00:00.000Z",
  endUtc: "2100-01-01T00:00:00.000Z",
};

interface NaturalDefinition {
  id: string;
  name: string;
  alternateNames?: string[];
  category: SpaceObject["category"];
  radiusKm: number;
  fact: string;
  frame?: SpaceObject["defaultReferenceFrame"];
}

const naturalDefinitions: NaturalDefinition[] = [
  {
    id: "sun",
    name: "Sun",
    category: "STAR",
    radiusKm: 695700,
    fact: "It contains almost all of the Solar System's mass and powers planetary climates through radiation.",
  },
  {
    id: "mercury",
    name: "Mercury",
    category: "PLANET",
    radiusKm: 2439.7,
    fact: "Its 3:2 spin-orbit resonance produces solar days that last two Mercurian years.",
  },
  {
    id: "venus",
    name: "Venus",
    category: "PLANET",
    radiusKm: 6051.8,
    fact: "A dense carbon-dioxide atmosphere drives the hottest surface conditions of any planet.",
  },
  {
    id: "earth",
    name: "Earth",
    alternateNames: ["Terra"],
    category: "PLANET",
    radiusKm: 6371,
    fact: "Liquid surface oceans and an active atmosphere make Earth the reference world for this atlas.",
  },
  {
    id: "moon",
    name: "Moon",
    alternateNames: ["Luna"],
    category: "MOON",
    radiusKm: 1737.4,
    fact: "Tidal locking keeps nearly the same hemisphere facing Earth while the Moon orbits our planet.",
    frame: "EARTH_CENTERED",
  },
  {
    id: "mars",
    name: "Mars",
    category: "PLANET",
    radiusKm: 3389.5,
    fact: "Iron oxides color its surface, while polar caps and ancient channels record a changing climate.",
  },
  {
    id: "jupiter",
    name: "Jupiter",
    category: "PLANET",
    radiusKm: 69911,
    fact: "The largest planet shapes small-body orbits and hosts a long-lived atmospheric storm called the Great Red Spot.",
  },
  {
    id: "saturn",
    name: "Saturn",
    category: "PLANET",
    radiusKm: 58232,
    fact: "Its bright rings are countless orbiting particles, mostly water ice, organized by resonances and moons.",
  },
  {
    id: "uranus",
    name: "Uranus",
    category: "PLANET",
    radiusKm: 25362,
    fact: "Its rotation axis lies close to its orbital plane, producing unusually extreme seasons.",
  },
  {
    id: "neptune",
    name: "Neptune",
    category: "PLANET",
    radiusKm: 24622,
    fact: "The outermost major planet has fast winds and was discovered after predictions from orbital perturbations.",
  },
  {
    id: "io",
    name: "Io",
    category: "MOON",
    radiusKm: 1821.6,
    fact: "Tidal flexing by Jupiter and neighboring moons makes Io the most volcanically active known world.",
  },
  {
    id: "europa",
    name: "Europa",
    category: "MOON",
    radiusKm: 1560.8,
    fact: "Its fractured ice shell is strong evidence for a global subsurface ocean.",
  },
  {
    id: "ganymede",
    name: "Ganymede",
    category: "MOON",
    radiusKm: 2634.1,
    fact: "It is the Solar System's largest moon and the only moon known to generate an intrinsic magnetic field.",
  },
  {
    id: "callisto",
    name: "Callisto",
    category: "MOON",
    radiusKm: 2410.3,
    fact: "Its ancient, heavily cratered surface preserves a long record of impacts in the Jovian system.",
  },
  {
    id: "titan",
    name: "Titan",
    category: "MOON",
    radiusKm: 2574.7,
    fact: "A nitrogen-rich atmosphere and methane lakes make Titan one of the most Earth-like landscapes chemically.",
  },
  {
    id: "triton",
    name: "Triton",
    category: "MOON",
    radiusKm: 1353.4,
    fact: "Its retrograde orbit suggests Neptune captured it from the outer Solar System.",
  },
  {
    id: "ceres",
    name: "Ceres",
    category: "DWARF_PLANET",
    radiusKm: 469.7,
    fact: "The largest body in the main asteroid belt shows bright salt deposits and evidence of past briny activity.",
  },
  {
    id: "pluto",
    name: "Pluto",
    category: "DWARF_PLANET",
    radiusKm: 1188.3,
    fact: "Its eccentric orbit and five moons belong to the dynamically rich Kuiper Belt region.",
  },
  {
    id: "halley",
    name: "Halley's Comet",
    alternateNames: ["1P/Halley", "Halley"],
    category: "COMET",
    radiusKm: 5.5,
    fact: "Its roughly 76-year return links modern orbital prediction with observations recorded for centuries.",
  },
  {
    id: "67p-churyumov-gerasimenko",
    name: "67P/Churyumov-Gerasimenko",
    alternateNames: ["67P"],
    category: "COMET",
    radiusKm: 2,
    fact: "Rosetta revealed a two-lobed nucleus whose jets strengthen as solar heating releases buried volatiles.",
  },
];

export const naturalObjects: SpaceObject[] = naturalDefinitions.map(
  (definition, index) => naturalObject(definition, index),
);

export const humanMadeObjects: SpaceObject[] = [
  satelliteObject(
    "iss",
    "International Space Station",
    ["ISS"],
    25544,
    0.055,
    "1998-11-20T00:00:00.000Z",
    "2035-01-01T00:00:00.000Z",
    "A continuously inhabited orbital laboratory assembled through international partnership.",
  ),
  satelliteObject(
    "hubble",
    "Hubble Space Telescope",
    ["HST"],
    20580,
    0.0065,
    "1990-04-24T00:00:00.000Z",
    "2035-01-01T00:00:00.000Z",
    "A servicing-enabled observatory whose images transformed optical and ultraviolet astronomy.",
  ),
  missionObject(
    "jwst",
    "James Webb Space Telescope",
    ["JWST"],
    0.01,
    "2021-12-25T13:01:10.000Z",
    "2031-10-04T23:59:59.000Z",
    "An infrared observatory operating near the Sun-Earth L2 region behind a layered sunshield.",
  ),
  missionObject(
    "voyager-1",
    "Voyager 1",
    [],
    0.00185,
    "1977-09-05T13:58:37.000Z",
    "2035-01-01T00:00:00.000Z",
    "The most distant human-made object, continuing an interstellar mission after encounters with Jupiter and Saturn.",
  ),
  missionObject(
    "parker-solar-probe",
    "Parker Solar Probe",
    ["PSP"],
    0.0015,
    "2018-08-12T08:15:15.000Z",
    "2026-10-18T00:00:00.000Z",
    "A solar mission using repeated Venus flybys to pass through the Sun's outer atmosphere.",
  ),
];

export const notableEvents: NotableEvent[] = [
  event(
    "moon-apollo-11",
    "moon",
    "MISSION_MILESTONE",
    "Apollo 11 landing",
    "1969-07-20T20:17:40.000Z",
    "Apollo 11 landed humans on the Moon. Source: NASA Apollo mission history.",
  ),
  event(
    "halley-1986-perihelion",
    "halley",
    "CLOSEST_APPROACH",
    "1986 perihelion",
    "1986-02-09T00:00:00.000Z",
    "Halley's Comet reached perihelion during its best-studied modern return. Source: NASA/JPL small-body records.",
  ),
  event(
    "pluto-new-horizons",
    "pluto",
    "FLYBY",
    "New Horizons flyby",
    "2015-07-14T11:49:00.000Z",
    "New Horizons made the first close reconnaissance of Pluto. Source: NASA New Horizons mission timeline.",
  ),
  event(
    "67p-rosetta-arrival",
    "67p-churyumov-gerasimenko",
    "MISSION_MILESTONE",
    "Rosetta arrival",
    "2014-08-06T00:00:00.000Z",
    "Rosetta became the first spacecraft to orbit a comet nucleus. Source: ESA Rosetta mission history.",
  ),
  event(
    "iss-first-module",
    "iss",
    "LAUNCH",
    "First ISS module",
    "1998-11-20T06:40:00.000Z",
    "Zarya launched as the first International Space Station module. Source: NASA ISS assembly history.",
  ),
  event(
    "hubble-launch",
    "hubble",
    "LAUNCH",
    "Hubble launch",
    "1990-04-24T12:33:51.000Z",
    "Space Shuttle Discovery launched Hubble into low Earth orbit. Source: NASA Hubble mission history.",
  ),
  event(
    "jwst-launch",
    "jwst",
    "LAUNCH",
    "JWST launch",
    "2021-12-25T12:20:00.000Z",
    "Ariane 5 launched Webb toward the Sun-Earth L2 region. Source: NASA Webb mission timeline.",
  ),
  event(
    "voyager-1-launch",
    "voyager-1",
    "LAUNCH",
    "Voyager 1 launch",
    "1977-09-05T12:56:00.000Z",
    "Voyager 1 began its outer-planet and interstellar mission. Source: NASA Voyager mission timeline.",
  ),
  event(
    "parker-launch",
    "parker-solar-probe",
    "LAUNCH",
    "Parker launch",
    "2018-08-12T07:31:00.000Z",
    "Parker Solar Probe launched on its mission to sample the solar corona. Source: NASA Parker Solar Probe mission timeline.",
  ),
];

function naturalObject(
  definition: NaturalDefinition,
  index: number,
): SpaceObject {
  const summary = `${definition.name} is a ${categoryLabel(definition.category)} represented with JPL Horizons ephemeris vectors.`;
  return {
    id: definition.id,
    canonicalName: definition.name,
    alternateNames: definition.alternateNames ?? [],
    category: definition.category,
    summary,
    details: `${summary} ${definition.fact} Positions use geometric ICRF/J2000-compatible state vectors sampled in UTC for educational interpolation.`,
    defaultReferenceFrame: definition.frame ?? "SUN_CENTERED",
    scale: {
      radiusKm: definition.radiusKm,
      illustrativeRadius: illustrativeRadius(index),
    },
    confidence: {
      level: "HIGH",
      summary:
        "Motion is derived from versioned NASA/JPL Horizons vector samples.",
    },
    limitations: [
      "This compact release stores 25 provider states across the interval; interpolation does not preserve short-period motion and must not be used for navigation or prediction.",
    ],
    validity: naturalValidity,
    sourceIds: ["jpl-horizons", "nasa-curated"],
    motion: {
      kind: "EPHEMERIS",
      frame: "ICRF_J2000",
      timeSystem: "UTC",
      segments: [
        {
          id: "1900-2100",
          path: `motion/${definition.id}/1900-2100.json`,
          checksum: placeholderChecksum,
          ...naturalValidity,
        },
      ],
    },
  };
}

function satelliteObject(
  id: string,
  name: string,
  alternateNames: string[],
  noradId: number,
  radiusKm: number,
  startUtc: string,
  endUtc: string,
  fact: string,
): SpaceObject {
  return {
    id,
    canonicalName: name,
    alternateNames,
    category: id === "hubble" ? "TELESCOPE" : "SATELLITE",
    summary: `${name} is a human-made object tracked in Earth orbit with CelesTrak OMM elements.`,
    details: `${fact} Its displayed trajectory is propagated with SGP4 from a timestamped element set, so uncertainty grows with element age.`,
    defaultReferenceFrame: "EARTH_CENTERED",
    scale: { radiusKm, illustrativeRadius: 0.34 },
    confidence: {
      level: "MEDIUM",
      summary:
        "Current CelesTrak elements support educational SGP4 propagation near their epoch.",
    },
    limitations: [
      "Element sets become stale quickly and are unsuitable for conjunction analysis, tracking, or navigation.",
    ],
    validity: { startUtc, endUtc },
    sourceIds: [`celestrak-${id}-${noradId}`, "nasa-curated"],
    motion: {
      kind: "SATELLITE_OMM",
      frame: "TEME",
      timeSystem: "UTC",
      path: `motion/${id}/latest.json`,
      checksum: placeholderChecksum,
    },
  };
}

function missionObject(
  id: string,
  name: string,
  alternateNames: string[],
  radiusKm: number,
  startUtc: string,
  endUtc: string,
  fact: string,
): SpaceObject {
  const validity = { startUtc, endUtc };
  return {
    id,
    canonicalName: name,
    alternateNames,
    category: id === "jwst" ? "TELESCOPE" : "SPACECRAFT",
    summary: `${name} is a human-made mission represented with NASA/JPL Horizons trajectory vectors.`,
    details: `${fact} Mission geometry is shown only over the provider-backed interval and does not imply live operational knowledge.`,
    defaultReferenceFrame: "SUN_CENTERED",
    scale: { radiusKm, illustrativeRadius: 0.3 },
    confidence: {
      level: "MEDIUM",
      summary:
        "Versioned JPL mission vectors support educational interpolation within the stated interval.",
    },
    limitations: [
      "This compact release stores 25 provider states across the mission interval; interpolated or predicted motion may change and is not suitable for spacecraft operations.",
    ],
    validity,
    sourceIds: ["jpl-horizons", "nasa-curated"],
    motion: {
      kind: "EPHEMERIS",
      frame: "ICRF_J2000",
      timeSystem: "UTC",
      segments: [
        {
          id: "mission",
          path: `motion/${id}/mission.json`,
          checksum: placeholderChecksum,
          ...validity,
        },
      ],
    },
  };
}

function event(
  id: string,
  objectId: string,
  kind: NotableEvent["kind"],
  title: string,
  occurredAtUtc: string,
  explanation: string,
): NotableEvent {
  return { id, objectId, kind, title, occurredAtUtc, explanation };
}

function categoryLabel(category: SpaceObject["category"]): string {
  return category.toLowerCase().replace("_", " ");
}

function illustrativeRadius(index: number): number {
  return Math.min(
    4.5,
    0.55 + Math.cbrt(naturalDefinitions[index]!.radiusKm) / 18,
  );
}
