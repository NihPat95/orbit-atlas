import { z } from "zod";

export const DATASET_SCHEMA_VERSION = 1 as const;

const finiteNumberSchema = z.number().finite();
const nonEmptyTextSchema = z.string().trim().min(1).max(2_000);
const idSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const isoUtcSchema = z.iso.datetime({ offset: true });
const checksumSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);

export const safeAssetPathSchema = z
  .string()
  .min(1)
  .max(512)
  .refine(
    (path) => !path.startsWith("/") && !path.includes("\\"),
    "Asset path must be relative",
  )
  .refine(
    (path) => !path.includes("?") && !path.includes("#"),
    "Asset path cannot contain a query",
  )
  .refine((path) => {
    try {
      const decoded = decodeURIComponent(path);
      const segments = decoded.split("/");
      return !segments.some(
        (segment) => segment === "" || segment === "." || segment === "..",
      );
    } catch {
      return false;
    }
  }, "Asset path contains an unsafe segment")
  .refine(
    (path) => !/^[a-z][a-z\d+.-]*:/i.test(path),
    "Asset path cannot be a URL",
  );

export const validityRangeSchema = z
  .object({
    startUtc: isoUtcSchema,
    endUtc: isoUtcSchema,
  })
  .strict()
  .superRefine(({ startUtc, endUtc }, context) => {
    if (Date.parse(startUtc) >= Date.parse(endUtc)) {
      context.addIssue({
        code: "custom",
        message: "Validity start must be before its end",
        path: ["endUtc"],
      });
    }
  });

export const assetReferenceSchema = z
  .object({
    path: safeAssetPathSchema,
    checksum: checksumSchema,
    bytes: z.number().int().nonnegative().max(1_000_000_000),
  })
  .strict();

export const sourceSnapshotSchema = z
  .object({
    id: idSchema,
    provider: z.enum(["JPL_HORIZONS", "NAIF", "CELESTRAK", "CURATED"]),
    retrievedAt: isoUtcSchema,
    sourceEpoch: isoUtcSchema.optional(),
    checksum: checksumSchema,
    attribution: nonEmptyTextSchema,
    sourceUrl: z
      .url()
      .refine((url) => url.startsWith("https://"), "Source URL must use HTTPS"),
  })
  .strict();

export const manifestSchema = z
  .object({
    schemaVersion: z.literal(DATASET_SCHEMA_VERSION),
    datasetVersion: idSchema,
    generatedAt: isoUtcSchema,
    sources: z.array(sourceSnapshotSchema).min(1).max(100),
    assets: z
      .object({
        catalog: assetReferenceSchema,
        motion: z.array(assetReferenceSchema).max(100_000),
      })
      .strict(),
  })
  .strict()
  .superRefine(({ sources, assets }, context) => {
    reportDuplicateValues(
      sources.map(({ id }) => id),
      ["sources"],
      "Source IDs must be unique",
      context,
    );
    reportDuplicateValues(
      [assets.catalog.path, ...assets.motion.map(({ path }) => path)],
      ["assets"],
      "Asset paths must be unique",
      context,
    );
  });

const segmentReferenceSchema = validityRangeSchema
  .extend({
    id: idSchema,
    path: safeAssetPathSchema,
    checksum: checksumSchema,
  })
  .strict();

const ephemerisMotionReferenceSchema = z
  .object({
    kind: z.literal("EPHEMERIS"),
    frame: z.literal("ICRF_J2000"),
    timeSystem: z.literal("UTC"),
    segments: z.array(segmentReferenceSchema).min(1).max(10_000),
  })
  .strict()
  .superRefine(({ segments }, context) => {
    reportDuplicateValues(
      segments.map(({ id }) => id),
      ["segments"],
      "Segment IDs must be unique",
      context,
    );

    for (let index = 1; index < segments.length; index += 1) {
      const previous = segments[index - 1];
      const current = segments[index];
      if (Date.parse(previous.endUtc) >= Date.parse(current.startUtc)) {
        context.addIssue({
          code: "custom",
          message: "Ephemeris segments must be ordered and non-overlapping",
          path: ["segments", index],
        });
      }
    }
  });

const satelliteMotionReferenceSchema = z
  .object({
    kind: z.literal("SATELLITE_OMM"),
    frame: z.literal("TEME"),
    timeSystem: z.literal("UTC"),
    path: safeAssetPathSchema,
    checksum: checksumSchema,
  })
  .strict();

export const motionReferenceSchema = z.discriminatedUnion("kind", [
  ephemerisMotionReferenceSchema,
  satelliteMotionReferenceSchema,
]);

export const spaceObjectSchema = z
  .object({
    id: idSchema,
    canonicalName: nonEmptyTextSchema.max(120),
    alternateNames: z.array(nonEmptyTextSchema.max(120)).max(20),
    category: z.enum([
      "STAR",
      "PLANET",
      "MOON",
      "DWARF_PLANET",
      "COMET",
      "SATELLITE",
      "TELESCOPE",
      "SPACECRAFT",
    ]),
    summary: nonEmptyTextSchema.max(500),
    details: nonEmptyTextSchema,
    defaultReferenceFrame: z.enum(["SUN_CENTERED", "EARTH_CENTERED"]),
    scale: z
      .object({
        radiusKm: finiteNumberSchema.positive(),
        illustrativeRadius: finiteNumberSchema.positive().max(100),
      })
      .strict(),
    confidence: z
      .object({
        level: z.enum(["HIGH", "MEDIUM", "LOW"]),
        summary: nonEmptyTextSchema.max(500),
      })
      .strict(),
    limitations: z.array(nonEmptyTextSchema.max(500)).min(1).max(20),
    validity: validityRangeSchema,
    sourceIds: z.array(idSchema).min(1).max(20),
    motion: motionReferenceSchema,
  })
  .strict()
  .superRefine(({ alternateNames, sourceIds, validity, motion }, context) => {
    reportDuplicateValues(
      alternateNames,
      ["alternateNames"],
      "Alternate names must be unique",
      context,
    );
    reportDuplicateValues(
      sourceIds,
      ["sourceIds"],
      "Source IDs must be unique",
      context,
    );

    if (motion.kind === "EPHEMERIS") {
      const validityStart = Date.parse(validity.startUtc);
      const validityEnd = Date.parse(validity.endUtc);
      for (const [index, segment] of motion.segments.entries()) {
        if (
          Date.parse(segment.startUtc) < validityStart ||
          Date.parse(segment.endUtc) > validityEnd
        ) {
          context.addIssue({
            code: "custom",
            message:
              "Motion segments must stay inside the object validity range",
            path: ["motion", "segments", index],
          });
        }
      }
    }
  });

export const notableEventSchema = z
  .object({
    id: idSchema,
    objectId: idSchema,
    kind: z.enum([
      "LAUNCH",
      "FLYBY",
      "CLOSEST_APPROACH",
      "RETURN",
      "MISSION_MILESTONE",
      "SEASONAL_MARKER",
    ]),
    title: nonEmptyTextSchema.max(160),
    explanation: nonEmptyTextSchema.max(1_000),
    occurredAtUtc: isoUtcSchema,
  })
  .strict();

export const catalogSchema = z
  .object({
    schemaVersion: z.literal(DATASET_SCHEMA_VERSION),
    datasetVersion: idSchema,
    objects: z.array(spaceObjectSchema).min(1).max(1_000),
    events: z.array(notableEventSchema).max(10_000),
  })
  .strict()
  .superRefine(({ objects, events }, context) => {
    const objectIds = new Set(objects.map(({ id }) => id));
    reportDuplicateValues(
      objects.map(({ id }) => id),
      ["objects"],
      "Object IDs must be unique",
      context,
    );
    reportDuplicateValues(
      events.map(({ id }) => id),
      ["events"],
      "Event IDs must be unique",
      context,
    );

    for (const [index, event] of events.entries()) {
      if (!objectIds.has(event.objectId)) {
        context.addIssue({
          code: "custom",
          message: `Event references unknown object: ${event.objectId}`,
          path: ["events", index, "objectId"],
        });
      }
    }
  });

export const vector3Schema = z.tuple([
  finiteNumberSchema,
  finiteNumberSchema,
  finiteNumberSchema,
]);

export const ephemerisSampleSchema = z
  .object({
    epochUtc: isoUtcSchema,
    positionKm: vector3Schema,
    velocityKmPerSecond: vector3Schema,
  })
  .strict();

export const ephemerisSeriesSchema = validityRangeSchema
  .extend({
    schemaVersion: z.literal(DATASET_SCHEMA_VERSION),
    objectId: idSchema,
    segmentId: idSchema,
    frame: z.literal("ICRF_J2000"),
    timeSystem: z.literal("UTC"),
    samples: z.array(ephemerisSampleSchema).min(2).max(100_000),
  })
  .strict()
  .superRefine(({ startUtc, endUtc, samples }, context) => {
    const start = Date.parse(startUtc);
    const end = Date.parse(endUtc);
    let previousEpoch = Number.NEGATIVE_INFINITY;

    for (const [index, sample] of samples.entries()) {
      const epoch = Date.parse(sample.epochUtc);
      if (epoch < start || epoch > end) {
        context.addIssue({
          code: "custom",
          message: "Sample falls outside the segment range",
          path: ["samples", index, "epochUtc"],
        });
      }
      if (epoch <= previousEpoch) {
        context.addIssue({
          code: "custom",
          message: "Samples must be in strictly increasing chronological order",
          path: ["samples", index, "epochUtc"],
        });
      }
      previousEpoch = epoch;
    }
  });

export const satelliteElementSetSchema = z
  .object({
    schemaVersion: z.literal(DATASET_SCHEMA_VERSION),
    objectId: idSchema,
    sourceId: idSchema,
    noradCatalogId: z.number().int().positive(),
    elementSetNumber: z.number().int().nonnegative(),
    epochUtc: isoUtcSchema,
    validity: validityRangeSchema,
    meanMotionRevsPerDay: finiteNumberSchema.positive(),
    eccentricity: finiteNumberSchema.gte(0).lt(1),
    inclinationDeg: finiteNumberSchema.gte(0).lte(180),
    rightAscensionAscendingNodeDeg: finiteNumberSchema.gte(0).lt(360),
    argumentOfPericenterDeg: finiteNumberSchema.gte(0).lt(360),
    meanAnomalyDeg: finiteNumberSchema.gte(0).lt(360),
    bstar: finiteNumberSchema,
  })
  .strict();

export const datasetSnapshotSchema = z
  .object({
    manifest: manifestSchema,
    catalog: catalogSchema,
  })
  .strict()
  .superRefine(({ manifest, catalog }, context) => {
    if (manifest.datasetVersion !== catalog.datasetVersion) {
      context.addIssue({
        code: "custom",
        message: "Manifest and catalog dataset versions must match",
        path: ["catalog", "datasetVersion"],
      });
    }

    const sourceIds = new Set(manifest.sources.map(({ id }) => id));
    const motionAssets = new Map(
      manifest.assets.motion.map(
        (asset) => [asset.path, asset.checksum] as const,
      ),
    );

    for (const [objectIndex, object] of catalog.objects.entries()) {
      for (const sourceId of object.sourceIds) {
        if (!sourceIds.has(sourceId)) {
          context.addIssue({
            code: "custom",
            message: `Object references unknown source: ${sourceId}`,
            path: ["catalog", "objects", objectIndex, "sourceIds"],
          });
        }
      }

      const references =
        object.motion.kind === "EPHEMERIS"
          ? object.motion.segments
          : [{ path: object.motion.path, checksum: object.motion.checksum }];
      for (const reference of references) {
        if (motionAssets.get(reference.path) !== reference.checksum) {
          context.addIssue({
            code: "custom",
            message: `Motion reference is missing or has a checksum mismatch: ${reference.path}`,
            path: ["catalog", "objects", objectIndex, "motion"],
          });
        }
      }
    }
  });

function reportDuplicateValues(
  values: string[],
  path: (string | number)[],
  message: string,
  context: z.core.$RefinementCtx,
): void {
  if (new Set(values).size !== values.length) {
    context.addIssue({ code: "custom", message, path });
  }
}
