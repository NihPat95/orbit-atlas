import type { SatelliteElementSet, Vector3 } from "../domain/types";

export interface SatelliteVectorFixture {
  name: string;
  atUtc: string;
  positionKm: Vector3;
  velocityKmPerSecond: Vector3;
  tolerance: {
    positionKm: number;
    velocityKmPerSecond: number;
  };
}

export const valladoElementSet: SatelliteElementSet = {
  schemaVersion: 1,
  objectId: "vanguard-1",
  sourceId: "vallado-sgp4-verification",
  noradCatalogId: 5,
  elementSetNumber: 475,
  epochUtc: "2000-06-27T18:50:19.733Z",
  validity: {
    startUtc: "2000-06-20T00:00:00.000Z",
    endUtc: "2000-07-10T00:00:00.000Z",
  },
  meanMotionRevsPerDay: 10.82419157,
  eccentricity: 0.1859667,
  inclinationDeg: 34.2682,
  rightAscensionAscendingNodeDeg: 348.7242,
  argumentOfPericenterDeg: 331.7664,
  meanAnomalyDeg: 19.3264,
  bstar: 2.8098e-5,
};

export const valladoSatelliteVectors: SatelliteVectorFixture[] = [
  {
    name: "at element epoch",
    atUtc: "2000-06-27T18:50:19.733Z",
    positionKm: [7022.46529266, -1400.08296755, 0.03995155],
    velocityKmPerSecond: [1.893841015, 6.405893759, 4.53480725],
    tolerance: {
      positionKm: 0.02,
      velocityKmPerSecond: 0.00002,
    },
  },
  {
    name: "360 minutes after epoch",
    atUtc: "2000-06-28T00:50:19.733Z",
    positionKm: [-7154.03120202, -3783.17682504, -3536.19412294],
    velocityKmPerSecond: [4.741887409, -4.151817765, -2.093935425],
    tolerance: {
      positionKm: 0.02,
      velocityKmPerSecond: 0.00002,
    },
  },
];

export const valladoFixtureProvenance = {
  title: "Revisiting Spacetrack Report #3, verification case 00005",
  authors: "David A. Vallado, Paul Crawford, Richard Hujsak, T. S. Kelso",
  sourceUrl: "https://celestrak.org/publications/AIAA/2006-6753/",
  frame: "TEME",
  units: "km and km/s",
  limitation:
    "The verification vectors test SGP4 compatibility; they are not current operational elements.",
};
