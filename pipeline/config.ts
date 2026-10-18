import type {
  DatasetCatalog,
  EphemerisSeries,
  SatelliteElementSet,
  SourceSnapshot,
  SpaceObject,
} from "../src/domain/types";

export const DEFAULT_STAGING_ROOT = ".staging/orbit-atlas";
export const DEFAULT_PUBLIC_DATA_ROOT = "public/data";
export const FIXTURE_INPUT_PATH = "pipeline/fixtures/dataset-input.json";

export interface DatasetBuildInput {
  generatedAt: string;
  sources: SourceSnapshot[];
  catalog: {
    objects: SpaceObject[];
    events: DatasetCatalog["events"];
  };
  motionAssets: MotionAssetInput[];
}

export type MotionAssetInput =
  | { path: string; data: EphemerisSeries }
  | { path: string; data: SatelliteElementSet };

export interface PipelineOptions {
  stagingRoot: string;
  publicDataRoot?: string;
}
