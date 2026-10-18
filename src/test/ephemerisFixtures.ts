import type { EphemerisSeries, Vector3 } from "../domain/types";

export interface HeldOutEphemerisFixture {
  name: string;
  source: {
    provider: "NASA/JPL Horizons";
    referenceFrame: "ICRF";
    center: "Sun (10)";
    target: "Earth (399)";
    units: "KM-S";
    retrievedAtUtc: string;
    sourceTimeNote: string;
    url: string;
  };
  series: EphemerisSeries;
  heldOut: {
    epochUtc: string;
    positionKm: Vector3;
    velocityKmPerSecond: Vector3;
    tolerance: {
      positionKm: number;
      velocityKmPerSecond: number;
    };
  };
}

const source = {
  provider: "NASA/JPL Horizons" as const,
  referenceFrame: "ICRF" as const,
  center: "Sun (10)" as const,
  target: "Earth (399)" as const,
  units: "KM-S" as const,
  retrievedAtUtc: "2026-10-17T19:24:33.000Z",
  sourceTimeNote:
    "Horizons reports pre-1962 UT output as UT1 and future UT as an extrapolation using the last known leap second.",
  url: "https://ssd.jpl.nasa.gov/api/horizons.api",
};

export const heldOutEphemerisFixtures: HeldOutEphemerisFixture[] = [
  {
    name: "Earth heliocentric state at the 1900 boundary",
    source,
    series: {
      schemaVersion: 1,
      objectId: "earth",
      segmentId: "earth-1900-boundary",
      frame: "ICRF_J2000",
      timeSystem: "UTC",
      startUtc: "1900-01-01T00:00:00.000Z",
      endUtc: "1900-01-02T00:00:00.000Z",
      samples: [
        {
          epochUtc: "1900-01-01T00:00:00.000Z",
          positionKm: [
            -2.945389818144775e7, 1.322106301416086e8, 5.735520718385622e7,
          ],
          velocityKmPerSecond: [
            -2.968592701748927e1, -5.572610637007794, -2.419447994185802,
          ],
        },
        {
          epochUtc: "1900-01-02T00:00:00.000Z",
          positionKm: [
            -3.201402482124311e7, 1.317084805871099e8, 5.713720124814394e7,
          ],
          velocityKmPerSecond: [
            -2.957459254476783e1, -6.050909869368254, -2.626837548458995,
          ],
        },
      ],
    },
    heldOut: {
      epochUtc: "1900-01-01T12:00:00.000Z",
      positionKm: [
        -3.073516392200558e7, 1.319647210782566e8, 5.72484440580369e7,
      ],
      velocityKmPerSecond: [
        -2.963151159433006e1, -5.811993760678799, -2.52325375107599,
      ],
      tolerance: {
        positionKm: 2,
        velocityKmPerSecond: 0.0001,
      },
    },
  },
  {
    name: "Earth heliocentric state at the 2100 boundary",
    source,
    series: {
      schemaVersion: 1,
      objectId: "earth",
      segmentId: "earth-2100-boundary",
      frame: "ICRF_J2000",
      timeSystem: "UTC",
      startUtc: "2100-12-30T00:00:00.000Z",
      endUtc: "2100-12-31T00:00:00.000Z",
      samples: [
        {
          epochUtc: "2100-12-30T00:00:00.000Z",
          positionKm: [
            -1.771900975096262e7, 1.34015165695189e8, 5.80667693986976e7,
          ],
          velocityKmPerSecond: [
            -3.006807135931192e1, -3.393765372690133, -1.470265141391889,
          ],
        },
        {
          epochUtc: "2100-12-31T00:00:00.000Z",
          positionKm: [
            -2.031400486147852e7, 1.337009916524125e8, 5.793064823813991e7,
          ],
          velocityKmPerSecond: [
            -2.999956340074748e1, -3.878596604818717, -1.6805998221497,
          ],
        },
      ],
    },
    heldOut: {
      epochUtc: "2100-12-30T12:00:00.000Z",
      positionKm: [
        -1.901724720350335e7, 1.338633149346508e8, 5.800098047342353e7,
      ],
      velocityKmPerSecond: [
        -3.003508978713742e1, -3.636319976371048, -1.575498357691322,
      ],
      tolerance: {
        positionKm: 2,
        velocityKmPerSecond: 0.0001,
      },
    },
  },
];
