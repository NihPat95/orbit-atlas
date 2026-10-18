import type { z } from "zod";

import type {
  assetReferenceSchema,
  catalogSchema,
  datasetSnapshotSchema,
  ephemerisSampleSchema,
  ephemerisSeriesSchema,
  manifestSchema,
  motionReferenceSchema,
  notableEventSchema,
  satelliteElementSetSchema,
  sourceSnapshotSchema,
  spaceObjectSchema,
  validityRangeSchema,
  vector3Schema,
} from "./schemas";

export type AssetReference = z.infer<typeof assetReferenceSchema>;
export type DatasetCatalog = z.infer<typeof catalogSchema>;
export type DatasetManifest = z.infer<typeof manifestSchema>;
export type DatasetSnapshot = z.infer<typeof datasetSnapshotSchema>;
export type EphemerisSample = z.infer<typeof ephemerisSampleSchema>;
export type EphemerisSeries = z.infer<typeof ephemerisSeriesSchema>;
export type MotionReference = z.infer<typeof motionReferenceSchema>;
export type NotableEvent = z.infer<typeof notableEventSchema>;
export type SatelliteElementSet = z.infer<typeof satelliteElementSetSchema>;
export type SourceSnapshot = z.infer<typeof sourceSnapshotSchema>;
export type SpaceObject = z.infer<typeof spaceObjectSchema>;
export type ValidityRange = z.infer<typeof validityRangeSchema>;
export type Vector3 = z.infer<typeof vector3Schema>;
