import { describe, expect, it } from "vitest";

import { catalogSchema } from "../../src/domain/schemas";
import {
  humanMadeObjects,
  naturalObjects,
  notableEvents,
} from "./catalogContent";

const naturalIds = [
  "sun",
  "mercury",
  "venus",
  "earth",
  "moon",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "io",
  "europa",
  "ganymede",
  "callisto",
  "titan",
  "triton",
  "ceres",
  "pluto",
  "halley",
  "67p-churyumov-gerasimenko",
];

describe("catalog content", () => {
  it("contains the fixed 20-object natural catalog with complete disclosures", () => {
    expect(naturalObjects.map(({ id }) => id)).toEqual(naturalIds);
    for (const object of naturalObjects) {
      expect(object.summary.length).toBeGreaterThan(20);
      expect(object.details.length).toBeGreaterThan(object.summary.length);
      expect(object.limitations.length).toBeGreaterThan(0);
      expect(object.sourceIds).toContain("jpl-horizons");
    }
  });

  it("contains the fixed five-object human-made catalog with provider-specific motion", () => {
    expect(humanMadeObjects.map(({ id }) => id)).toEqual([
      "iss",
      "hubble",
      "jwst",
      "voyager-1",
      "parker-solar-probe",
    ]);
    expect(
      humanMadeObjects
        .slice(0, 2)
        .every(({ motion }) => motion.kind === "SATELLITE_OMM"),
    ).toBe(true);
    expect(
      humanMadeObjects
        .slice(2)
        .every(({ motion }) => motion.kind === "EPHEMERIS"),
    ).toBe(true);
  });

  it("keeps descriptions and attributed events plain text and schema-valid", () => {
    const catalog = {
      schemaVersion: 1 as const,
      datasetVersion: "content-preview",
      objects: [...naturalObjects, ...humanMadeObjects],
      events: notableEvents,
    };

    expect(catalogSchema.safeParse(catalog).success).toBe(true);
    for (const text of catalog.objects.flatMap((object) => [
      object.summary,
      object.details,
      ...object.limitations,
    ])) {
      expect(text).not.toMatch(/<[^>]+>/);
    }
    for (const event of notableEvents) {
      expect(event.explanation).toMatch(/Source:/);
      expect(event.explanation).not.toMatch(/<[^>]+>/);
    }
  });
});
