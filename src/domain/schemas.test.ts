import { describe, expect, it } from "vitest";

import {
  catalogSchema,
  datasetSnapshotSchema,
  ephemerisSeriesSchema,
  manifestSchema,
} from "./schemas";
import {
  validDatasetSnapshot,
  validEphemerisSeries,
} from "../test/dataFixtures";

describe("runtime data schemas", () => {
  it("accepts a coherent versioned dataset snapshot", () => {
    expect(datasetSnapshotSchema.parse(validDatasetSnapshot)).toEqual(
      validDatasetSnapshot,
    );
  });

  it("rejects unsupported schema versions", () => {
    const manifest = structuredClone(validDatasetSnapshot.manifest);
    manifest.schemaVersion = 2;

    expect(manifestSchema.safeParse(manifest).success).toBe(false);
  });

  it("rejects duplicate object identifiers", () => {
    const catalog = structuredClone(validDatasetSnapshot.catalog);
    catalog.objects.push(structuredClone(catalog.objects[0]));

    expect(catalogSchema.safeParse(catalog).success).toBe(false);
  });

  it("rejects events that reference an unknown object", () => {
    const snapshot = structuredClone(validDatasetSnapshot);
    snapshot.catalog.events[0].objectId = "mars";

    expect(datasetSnapshotSchema.safeParse(snapshot).success).toBe(false);
  });

  it("rejects unsafe asset paths", () => {
    const manifest = structuredClone(validDatasetSnapshot.manifest);
    manifest.assets.catalog.path = "../catalog.json";

    expect(manifestSchema.safeParse(manifest).success).toBe(false);
  });

  it("rejects reversed validity ranges", () => {
    const catalog = structuredClone(validDatasetSnapshot.catalog);
    catalog.objects[0].validity.startUtc = "2100-01-01T00:00:00.000Z";
    catalog.objects[0].validity.endUtc = "1900-01-01T00:00:00.000Z";

    expect(catalogSchema.safeParse(catalog).success).toBe(false);
  });

  it("rejects non-finite and unordered ephemeris samples", () => {
    const nonFinite = structuredClone(validEphemerisSeries);
    nonFinite.samples[0].positionKm[0] = Number.POSITIVE_INFINITY;

    const unordered = structuredClone(validEphemerisSeries);
    unordered.samples.reverse();

    expect(ephemerisSeriesSchema.safeParse(nonFinite).success).toBe(false);
    expect(ephemerisSeriesSchema.safeParse(unordered).success).toBe(false);
  });
});
