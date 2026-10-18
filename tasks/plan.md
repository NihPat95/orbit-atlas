# Implementation Plan: Orbit Atlas v1

## Overview

Orbit Atlas is a desktop-first, static 3D educational experience for exploring the position and motion of 25 curated natural and human-made space objects. The application uses React, React Three Fiber, Three.js, and a Web Worker at runtime. A manually invoked TypeScript pipeline builds immutable, versioned data from JPL Horizons and CelesTrak for GitHub Pages deployment.

Tasks are tracked in `tasks/todo.md`. A task may be marked complete only after all acceptance criteria, focused verification, the shared verification suite, and the applicable Definition of Done checks pass. Work pauses for user review at every checkpoint.

## Architecture Decisions

- Use Node 24, npm, TypeScript, Vite, React, React Three Fiber, Three.js, Vitest, Testing Library, and Playwright.
- Serve public, same-origin assets from `/data/manifest.json`, `/data/{datasetVersion}/catalog.json`, and `/data/{datasetVersion}/motion/{objectId}/{segment}.json`.
- Derive TypeScript data types from runtime validation schemas. Reject unsupported schemas, invalid paths, checksum failures, non-finite values, and broken relationships.
- Keep scientific state in 64-bit kilometre and kilometre-per-second coordinates; emit camera-relative `Float32Array` render buffers from a versioned Web Worker protocol.
- Interpolate JPL ephemerides with cubic Hermite interpolation. Propagate normalized CelesTrak OMM records with SGP4 and expose the documented TEME conversion limitation.
- Treat Sun- and Earth-centered frames as coordinate origins independent of camera control. Scale modes transform rendering only.
- Generate procedural visual assets. Catalog summaries remain plain text.
- Build datasets into staging, validate the complete snapshot, and replace the public manifest only after all gates pass.

## Public Interfaces

- `DatasetManifest`, `SourceSnapshot`, `SpaceObject`, `NotableEvent`, `EphemerisSeries`, and `SatelliteElementSet` are schema-versioned runtime contracts.
- Worker requests: `initialize`, `setTime`, `setReferenceFrame`, and `setRenderContext`.
- Worker responses: `ready`, `positions`, `dataStatus`, and `error`.
- Requests and responses include protocol version and generation; stale generations are discarded.
- SHA-256 checksums cover served bytes. Dataset versions are deterministic content hashes.

### Dataset boundary

- Schema version 1 uses strict objects, UTC timestamps with offsets, finite kilometre vectors, bounded collections, lowercase slug IDs, and safe relative asset paths.
- `DatasetManifest` owns source snapshots plus catalog and motion asset references. `DatasetCatalog` owns objects and notable events. Cross-document validation requires matching dataset versions, valid source IDs, valid event object IDs, and matching motion paths/checksums.
- `DatasetError` has stable codes: `ABORTED`, `CHECKSUM_MISMATCH`, `HTTP_STATUS`, `INVALID_JSON`, `INVALID_SCHEMA`, `NETWORK`, and `UNSUPPORTED_SCHEMA`.

### Worker boundary

- Protocol version 1 permits at most 1,000 unique object IDs. Numeric inputs and output buffers must be finite; a positions response contains exactly three `Float32` values per object.
- Every outgoing client request increments the generation. The client delivers only responses matching its latest generation, and the worker ignores older incoming generations.
- Worker errors use `INTERNAL`, `INVALID_MESSAGE`, or `NOT_INITIALIZED`. Numerical updates remain silent until Tasks 7-9 implement their response behavior.

## Dependency Graph

```text
Tracker -> Toolchain -> Shell -> Schemas -> Loader -> Worker protocol
                                          |          |
                                          |          +-> Ephemeris -> Frames/transforms
                                          |          +-> SGP4 ------^
                                          |                         |
                                          +-> Ingestion pipeline ---+

Frames/transforms -> Scene -> Discovery -> Timeline -> Events/details/recovery
Ingestion sources -> Curated catalog -> Versioned dataset
Experience + dataset -> Performance/security -> CI/Pages -> Browser release validation
```

## Fixed Catalog

Natural objects: Sun; Mercury; Venus; Earth; Moon; Mars; Jupiter; Saturn; Uranus; Neptune; Io; Europa; Ganymede; Callisto; Titan; Triton; Ceres; Pluto; Halley; and 67P/Churyumov-Gerasimenko.

Human-made objects: International Space Station; Hubble Space Telescope; James Webb Space Telescope; Voyager 1; and Parker Solar Probe.

## Checkpoints

1. Tasks 1-3: tracker, reproducible toolchain, and tested application shell.
2. Tasks 4-6: runtime schemas, loader, and worker protocol.
3. Tasks 7-9: ephemeris, SGP4, frames, and render transforms.
4. Tasks 10-12: moving scene, discovery, and timeline.
5. Tasks 13-15: trajectories, learning layers, and recovery.
6. Tasks 16-18: deterministic pipeline and both upstream adapters.
7. Tasks 19-21: curated 25-object catalog and integrated dataset.
8. Tasks 22-24: performance, security, and deployment workflows.
9. Task 25: cross-browser and production release validation.

At each checkpoint, record verification evidence in `tasks/todo.md`, stop implementation, and request user review before continuing.

## Definition of Done

- All task-specific acceptance criteria pass at runtime, not only at compile time.
- New behavior has a test that was observed failing before implementation and passing afterward.
- Existing tests, type checking, linting, formatting, and production build pass.
- Edge cases and failure paths are covered without dead code, debug output, or unrelated refactors.
- Public behavior and interfaces are documented, security implications are reviewed, and rollback remains possible.
- Deployment requires explicit human review and approval.

## Risks and Mitigations

| Risk                                       | Impact | Mitigation                                                                                          |
| ------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------- |
| Upstream rate limits or outages            | High   | Recorded fixtures, bounded retries, cached segmented fetches, and non-publishing smoke checks       |
| Coordinate-frame mistakes                  | High   | Held-out authoritative vectors, explicit frame metadata, and isolated transform tests               |
| GPU precision loss                         | High   | CPU-side 64-bit state plus camera-relative transferable 32-bit render buffers                       |
| Dataset or bundle exceeds budgets          | High   | Segmentation, lazy loading, procedural visuals, and automated compressed-size gates                 |
| GitHub Pages mixes app and data versions   | High   | Atomic deployment of a selected immutable dataset and cache/version tests                           |
| No repository remote exists                | Medium | Build workflows locally; leave remote execution and production release open until configured        |
| Accessibility is deferred by product scope | Medium | Preserve semantic HTML and keyboard basics without claiming conformance; document the redesign risk |

## Assumptions

- The application is educational and cannot be used for navigation or professional orbital analysis.
- Natural-body coverage targets 1900-2100. Spacecraft and satellites expose only defensible provider ranges.
- No accounts, backend, analytics, saved state, sharing, offline support, or mobile optimization are included in v1.
- Deployment and final release remain incomplete until a GitHub remote, Pages configuration, and explicit user approval exist.
