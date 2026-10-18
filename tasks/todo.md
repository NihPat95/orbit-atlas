# Orbit Atlas v1 Task List

## Completion Rules

- `[ ]` means not complete. `IN PROGRESS` identifies the single active task.
- Change a task to `[x]` only after every acceptance criterion and verification item passes and evidence is recorded below it.
- Each behavioral task follows red-green-refactor: observe a focused test fail, implement the minimum behavior, then rerun the focused and shared verification suites.
- Stop at every checkpoint for user review before starting the next phase.

## Phase 1 — Planning and Application Foundation

### Task 1: Create the durable implementation tracker — COMPLETE

- [x] `tasks/plan.md` records decisions, dependencies, risks, checkpoints, and the fixed catalog.
- [x] This file records all 25 tasks with acceptance criteria, verification, dependencies, likely files, and initial state.
- [x] The completion rules prevent checking off work without evidence.

**Verification:** Compare both files with the approved plan; confirm no task has more than three acceptance criteria.
**Dependencies:** None
**Files / scope:** `tasks/plan.md`, `tasks/todo.md` — S

### Task 2: Configure the pinned frontend toolchain — COMPLETE

- [x] Node 24 and exact npm dependencies are declared and reproducibly locked.
- [x] Scripts cover build, dev, typecheck, lint, formatting, unit, browser, data, performance, security, and full verification.
- [x] Vite builds for root and configurable GitHub Pages base paths.

**Verification:** `npm ci && npm run build && npm run typecheck`
**Dependencies:** Task 1
**Files / scope:** `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `index.html` — M

### Task 3: Build the tested application shell — COMPLETE

- [x] The React shell renders a loading-safe application frame without console errors.
- [x] Global styling provides a desktop-first, full-viewport procedural space theme.
- [x] A smoke test proves rendering, and the production bundle loads from a configured subpath.

**Verification:** `npm test -- App && npm run build`; inspect the production preview in a real browser.
**Dependencies:** Task 2
**Files / scope:** `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/App.test.tsx` — S

## Checkpoint 1 — Foundation Review

- [x] Tasks 1-3 meet acceptance criteria and Definition of Done.
- [x] Clean install, typecheck, tests, lint, formatting, and build pass.
- [x] User approves the tracker, dependency order, and application shell.

## Phase 2 — Runtime Contracts

### Task 4: Define versioned data schemas — COMPLETE

- [x] Schemas and derived types cover all required manifest, catalog, provenance, event, validity, confidence, and motion fields.
- [x] Validation rejects unsupported versions, duplicate IDs, invalid relationships, non-finite values, reversed ranges, and unsafe paths.
- [x] Valid and invalid fixtures prove the schema boundaries.

**Verification:** `npm test -- schemas && npm run typecheck`
**Dependencies:** Task 3
**Files / scope:** `src/domain/schemas.ts`, `src/domain/types.ts`, `src/domain/schemas.test.ts`, `src/test/dataFixtures.ts` — M

### Task 5: Implement the same-origin dataset loader — COMPLETE

- [x] The loader retrieves manifest, catalog, and individual motion segments from the configured base path.
- [x] Assets are schema-validated and SHA-256 verified before use.
- [x] Unsupported, missing, corrupt, or aborted assets return typed hard-data errors without guessed positions.

**Verification:** `npm test -- datasetLoader`
**Dependencies:** Task 4
**Files / scope:** `src/data/datasetLoader.ts`, `src/data/checksum.ts`, `src/data/errors.ts`, `src/data/datasetLoader.test.ts` — M

### Task 6: Establish the simulation-worker protocol — COMPLETE

- [x] Versioned unions cover initialization, time, frame, render context, positions, status, readiness, and errors.
- [x] Generations discard stale results after rapid updates.
- [x] Position arrays transfer without cloning; malformed or oversized requests are rejected.

**Verification:** `npm test -- workerProtocol`
**Dependencies:** Tasks 4-5
**Files / scope:** `src/worker/protocol.ts`, `src/worker/client.ts`, `src/worker/simulation.worker.ts`, `src/worker/protocol.test.ts` — M

## Checkpoint 2 — Contract Review

- [x] Tasks 4-6 pass schemas, loader, checksums, and protocol tests.
- [x] Public data and worker contracts are documented.
- [x] User approves the contracts before numerical work.

## Phase 3 — Scientific Motion

### Task 7: Add natural-body ephemeris interpolation — COMPLETE

- [x] Cubic Hermite interpolation returns finite positions and velocities at endpoints and intermediate UTC times.
- [x] Missing segments and out-of-range times return explicit statuses.
- [x] Held-out fixtures pass recorded tolerances, including 1900 and 2100 boundaries.

**Verification:** `npm test -- ephemeris`
**Dependencies:** Task 6
**Files / scope:** `src/simulation/ephemeris.ts`, `src/simulation/time.ts`, `src/simulation/ephemeris.test.ts`, `src/test/ephemerisFixtures.ts` — M

### Task 8: Add satellite OMM propagation — COMPLETE

- [x] Normalized OMM data propagates through SGP4 without runtime upstream requests.
- [x] Element age, validity, non-finite output, and propagation failure produce explicit statuses.
- [x] Held-out satellite vectors pass recorded tolerances near and away from epoch.

**Verification:** `npm test -- satellitePropagation`
**Dependencies:** Task 6
**Files / scope:** `src/simulation/satellite.ts`, `src/simulation/satellite.test.ts`, `src/test/satelliteFixtures.ts` — M

### Task 9: Implement reference-frame and render transforms — COMPLETE

- [x] Sun- and Earth-centered output derives from common scientific state, including documented TEME conversion.
- [x] Camera-relative transforms preserve 64-bit state and emit finite transferable 32-bit buffers.
- [x] Scale modes change render transforms only; round-trip and non-mutation tests pass.

**Verification:** `npm test -- frames renderTransform`
**Dependencies:** Tasks 7-8
**Files / scope:** `src/simulation/frames.ts`, `src/simulation/renderTransform.ts`, `src/simulation/frames.test.ts`, `src/worker/simulation.worker.ts` — M

## Checkpoint 3 — Scientific Review

- [x] Interpolation, SGP4, UTC, frame, origin, scale, and error tests pass.
- [x] Fixture tolerances and satellite limitations are documented.
- [x] User approves the scientific evidence.

## Phase 4 — Core Exploration Loop

### Task 10: Render the interactive moving scene — COMPLETE

- [x] Procedural markers move from worker buffers without per-frame React rerenders.
- [x] Orbit, pan, zoom, spatial travel, and default-view reset work with mouse and trackpad.
- [x] Picking, labels, resize handling, and cleanup work without loop or listener leaks.

**Verification:** Focused unit tests and `npm run test:e2e -- scene`; manual camera exercise.
**Dependencies:** Tasks 5-6 and 9
**Files / scope:** `src/scene/OrbitScene.tsx`, `src/scene/ObjectLayer.tsx`, `src/scene/CameraController.tsx`, `tests/scene.spec.ts` — M

**Evidence — 2026-10-17:** Red tests first failed because the worker emitted readiness but no positions. `npm test -- scene App` passes (3 focused tests); `npm run test:e2e -- scene` passes in Chromium with worker readiness, HTML labels, picking, orbit/zoom gestures, reset, and resize; `npm run verify` passes (9 files / 40 tests, lint, formatting, typecheck, and production build). Worker, camera-control, interval, and label animation listeners are all disposed during unmount. The scene identifies its deterministic motion as preview fixtures pending the published dataset.

### Task 11: Add browsing, search, selection, and follow — COMPLETE

- [x] Browse by category and case-insensitive canonical or alternate name works.
- [x] Selection focuses and follows without disabling free camera movement.
- [x] Stop-following, recenter, selection changes, and reset behave deterministically.

**Verification:** `npm test -- catalog selection && npm run test:e2e -- discovery`
**Dependencies:** Task 10
**Files / scope:** `src/features/catalog/CatalogPanel.tsx`, `src/features/catalog/search.ts`, `src/state/explorationStore.ts`, `src/features/catalog/CatalogPanel.test.tsx`, `tests/discovery.spec.ts` — M

**Evidence — 2026-10-17:** Missing-module failures established the red state. `npm test -- catalog selection App` passes search, category, selection, follow, recenter, selection-change, and reset cases. `npm run test:e2e -- discovery scene` passes both the full discovery flow and scene regression in Chromium. `npm run verify` passes (11 files / 43 tests plus lint, formatting, typecheck, and build). OrbitControls remains active while the camera carries its user-controlled offset with a followed object.

### Task 12: Add timeline and date navigation — COMPLETE

- [x] Pause, resume, speed, scrub, and direct UTC date update the worker-owned clock.
- [x] Rapid scrubbing displays only the latest generation and keeps controls responsive.
- [x] Controls enforce validity and explain approximate, stale, or unsupported dates.

**Verification:** `npm test -- timeline && npm run test:e2e -- timeline`
**Dependencies:** Tasks 9-11
**Files / scope:** `src/features/timeline/Timeline.tsx`, `src/state/simulationClock.ts`, `src/features/timeline/Timeline.test.tsx`, `tests/timeline.spec.ts` — M

**Evidence — 2026-10-17:** Missing-module failures established the red state. `npm test -- timeline App scene` passes clock, UI, worker, and shell cases. `npm run test:e2e -- timeline discovery scene` passes rapid scrub, playback, stale/unsupported validity, discovery, follow, camera, reset, and resize flows in Chromium. `npm run verify` passes (12 files / 45 tests plus lint, formatting, typecheck, and build). Manual 1440×900 review confirmed the composed three-column interface, selection/follow, paused clock, free orbit movement while following, stop-following, reset, and an empty browser error log. Unsupported requests retain the worker’s last defensible position; worker response generations suppress stale results.

## Checkpoint 4 — Core Experience Review

- [x] Search, select, focus, follow, time change, and reset work end-to-end.
- [x] Camera freedom and worker responsiveness are demonstrated.
- [x] User approves the core interaction loop.

### Checkpoint 4 approval — 2026-10-17

- User approved the core interaction checkpoint and asked implementation to continue.

## Phase 5 — Learning, Transparency, and Recovery

### Task 13: Show selected trajectories and notable events — COMPLETE

- [x] The selected trajectory is distinct without implying unsupported precision.
- [x] Relevant events appear and can move simulation time.
- [x] Events outside source validity cannot request a false calculated position.

**Verification:** `npm test -- trajectory events && npm run test:e2e -- events`
**Dependencies:** Tasks 11-12
**Files / scope:** `src/scene/TrajectoryLayer.tsx`, `src/features/timeline/EventMarkers.tsx`, `src/features/timeline/EventMarkers.test.tsx`, `tests/events.spec.ts` — M

**Evidence — 2026-10-17:** Missing-module failures established the red state. `npm test -- trajectory events` passes finite sampled-guide and supported/context-only event cases. `npm run test:e2e -- events` passes the Earth event time jump and confirms the out-of-coverage ISS launch remains visible and disabled without changing time. `npm run verify` passes (14 files / 47 tests plus lint, formatting, typecheck, and build). The selected guide uses a dashed procedural line and is explicitly labeled approximate.

### Task 14: Add educational details and display controls

- [ ] Every selection shows a plain-language summary before optional technical details.
- [ ] Frame, scale, confidence, source epoch, age, and limitations remain understandable.
- [ ] Frame and scale changes preserve time, selection, scientific state, and camera freedom.

**Verification:** `npm test -- details displayControls && npm run test:e2e -- disclosures`
**Dependencies:** Tasks 11-13
**Files / scope:** `src/features/details/ObjectDetails.tsx`, `src/features/display/DisplayControls.tsx`, `src/features/details/ObjectDetails.test.tsx`, `tests/disclosures.spec.ts` — M

### Task 15: Implement loading and failure recovery

- [ ] Shell, scene, segment, empty-search, and retry states are distinguishable.
- [ ] A bad object asset disables only that object and explains the failure.
- [ ] Missing WebGL 2 shows an explanatory fallback instead of a broken canvas.

**Verification:** `npm test -- recovery && npm run test:e2e -- failures`; manually force WebGL and network failures.
**Dependencies:** Tasks 5-6 and 10-14
**Files / scope:** `src/features/status/DataStatusView.tsx`, `src/scene/WebGLBoundary.tsx`, `src/features/status/DataStatusView.test.tsx`, `tests/failures.spec.ts` — M

## Checkpoint 5 — Product Experience Review

- [ ] Event, disclosure, failure, and fallback scenarios pass.
- [ ] No UI path silently guesses a position.
- [ ] User approves the fixture-backed experience.

## Phase 6 — Deterministic Data Ingestion

### Task 16: Build the validation-first publication pipeline

- [ ] The CLI normalizes content, calculates checksums and version, and writes only to staging.
- [ ] Complete schema, ID, relationship, chronology, finite-value, provenance, count, and path validation gates publication.
- [ ] Identical inputs produce byte-identical assets; failure leaves the known-good manifest untouched.

**Verification:** `npm test -- pipeline && npm run data:build -- --fixtures && npm run data:validate`; rebuild and compare hashes.
**Dependencies:** Task 4
**Files / scope:** `pipeline/cli.ts`, `pipeline/buildDataset.ts`, `pipeline/validateDataset.ts`, `pipeline/buildDataset.test.ts`, `pipeline/config.ts` — M

### Task 17: Add JPL Horizons ingestion

- [ ] The importer fetches and caches segmented natural and mission vectors without browser credentials.
- [ ] Data normalizes into ordered ICRF/J2000-compatible samples with full provenance.
- [ ] Fixtures cover success, provider errors, malformed data, UTC, and 1900-2100 boundaries.

**Verification:** `npm test -- horizons`; run a non-publishing live smoke fetch.
**Dependencies:** Task 16
**Files / scope:** `pipeline/sources/horizons.ts`, `pipeline/sources/normalizeHorizons.ts`, `pipeline/sources/horizons.test.ts`, `pipeline/fixtures/horizons.json` — M

### Task 18: Add CelesTrak OMM ingestion

- [ ] The importer normalizes configured NORAD records with validity and provenance.
- [ ] Missing, malformed, duplicate, or stale records fail or return explicit stale status.
- [ ] Recorded fixtures prove normalization and SGP4 compatibility offline.

**Verification:** `npm test -- celestrak`; run a non-publishing live smoke fetch.
**Dependencies:** Task 16
**Files / scope:** `pipeline/sources/celestrak.ts`, `pipeline/sources/normalizeOmm.ts`, `pipeline/sources/celestrak.test.ts`, `pipeline/fixtures/celestrak.json` — M

## Checkpoint 6 — Ingestion Review

- [ ] Fixture builds are deterministic and publication is failure-safe.
- [ ] JPL and CelesTrak live smoke fetches validate without publication.
- [ ] User approves provenance and provider behavior.

## Phase 7 — Representative Catalog and Dataset

### Task 19: Curate the 20 natural objects

- [ ] Content covers the fixed 20-object natural catalog.
- [ ] Every record includes required names, explanation, metadata, validity, attribution, and limits.
- [ ] Events and descriptions are source-attributed plain text and validate.

**Verification:** `npm run data:validate -- --content-only && npm test -- catalogContent`
**Dependencies:** Tasks 16-17
**Files / scope:** Natural content, event content, attribution index, and content tests — M

### Task 20: Curate the five human-made objects

- [ ] Content covers ISS, Hubble, JWST, Voyager 1, and Parker Solar Probe.
- [ ] ISS/Hubble use CelesTrak OMM; the other missions use JPL ephemerides.
- [ ] Ranges, ages, limits, launches, encounters, and milestones are disclosed.

**Verification:** `npm run data:validate -- --content-only && npm test -- catalogContent`
**Dependencies:** Tasks 16-18
**Files / scope:** Spacecraft content, event content, attribution index, and content tests — M

### Task 21: Generate and integrate the versioned dataset

- [ ] The catalog has exactly 25 objects and initial motion assets for all of them.
- [ ] Natural coverage is 1900-2100; mission and satellite ranges match providers.
- [ ] Manifests, checksums, segments, provenance, deterministic rebuild, and size validation pass.

**Verification:** `npm run data:build && npm run data:validate && npm run test:e2e -- dataset`; rebuild and compare hashes.
**Dependencies:** Tasks 17-20
**Files / scope:** Dataset config, integration test, and generated versioned assets — M excluding generated files

## Checkpoint 7 — Dataset Review

- [ ] The 25-object dataset replaces fixtures.
- [ ] Every object moves, discloses limitations, and handles validity boundaries.
- [ ] User approves catalog content and generated data evidence.

## Phase 8 — Production Quality and Delivery

### Task 22: Enforce loading and runtime performance budgets

- [ ] Compressed shell is at most 3 MB and initial scene transfer at most 8 MB.
- [ ] Representative hardware meets the 2.5 s UI, 5 s scene, and 100 ms control targets.
- [ ] Testing records a 60 FPS target and 30 FPS minimum with lazy motion loading.

**Verification:** `npm run perf`; record size, timing, latency, and FPS evidence.
**Dependencies:** Tasks 10-15 and 21
**Files / scope:** Budget script, browser performance test, reporting config, and report — M

### Task 23: Harden the static trust boundary

- [ ] Network access is same-origin under a GitHub-Pages-compatible CSP.
- [ ] Plain text, schemas, checksums, cancellation, and numeric/count bounds protect inputs.
- [ ] Adversarial fixtures cover paths, size, non-finite values, URLs, and markup.

**Verification:** `npm run test:security && npm audit --omit=dev`; inspect CSP and production network activity.
**Dependencies:** Tasks 5-6, 15-16, and 21
**Files / scope:** CSP, security bounds, adversarial tests, and security notes — M

### Task 24: Add CI, publication, and Pages deployment

- [ ] Pull requests run install, format, lint, typecheck, unit, data, build, and browser smoke gates.
- [ ] Manual data/deploy workflows use pinned actions, least privilege, and atomic app/data publication.
- [ ] Failed validation cannot deploy; artifacts and a prior-ref runbook support rollback.

**Verification:** Validate workflow syntax and local equivalents, then execute on the configured remote.
**Dependencies:** Tasks 21-23
**Files / scope:** CI, data and Pages workflows, deployment config, rollback runbook — M

## Checkpoint 8 — Ship-Readiness Review

- [ ] Performance, security, CI, dataset, and rollback evidence pass.
- [ ] User approves the production artifact before release.

### Task 25: Complete cross-browser launch validation

- [ ] Critical flows pass in the latest two stable desktop Chrome, Edge, Firefox, and Safari.
- [ ] Platform assumptions, limitations, freshness, rollback, and deferred accessibility are documented.
- [ ] Release remains unchecked until the user approves and a Pages-enabled remote exists.

**Verification:** `npm run verify && npm run test:e2e`; record browser matrix and verify the deployed URL.
**Dependencies:** Task 24
**Files / scope:** Browser matrix, release checklist, operations guide, and README — M

## Final Checkpoint — Complete

- [ ] All 25 tasks and checkpoints have evidence.
- [ ] The full Definition of Done passes.
- [ ] Production serves the exact validated dataset version.
- [ ] Human approval and rollback readiness are recorded.

## Evidence Log

Evidence is appended here when a task completes. Do not pre-check acceptance criteria.

### Task 1 — 2026-10-17

- Confirmed `tasks/plan.md` contains the architecture decisions, dependency graph, fixed 25-object catalog, checkpoints, risks, and assumptions.
- Confirmed `tasks/todo.md` contains exactly 25 task headings and no task contains more than three acceptance-criteria checkboxes.
- Confirmed the task-state and evidence rules require acceptance criteria, verification, Definition of Done, and checkpoint review before progression.

### Task 2 — 2026-10-17

- `npm ci --ignore-scripts`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm run format:check`, and `npm test` pass.
- `ORBIT_ATLAS_BASE_PATH=orbit-atlas npm run build` passes, verifying configurable Pages subpath support.
- The lockfile resolves 260 packages with zero audit vulnerabilities. The execution host runs Node 26.5.1, so npm emits the expected engine warning while the project contract remains pinned to Node 24.15-24.x.

### Task 3 — 2026-10-17

- RED: `npm test -- App` failed because `src/App.tsx` did not exist. GREEN: the same focused command passes after implementing the shell; the full `npm run verify` gate also passes.
- The production output is 0.35 kB HTML, 2.45 kB CSS, and 69.75 kB JavaScript compressed.
- Real-browser verification at 320, 461, 768, 1024, and 1440 CSS-pixel widths found no horizontal overflow, console errors, or warnings. The desktop accessibility tree exposes the banner, catalog, space-map status, and details landmarks.
- A build and preview using `ORBIT_ATLAS_BASE_PATH=orbit-atlas` loaded successfully at `/orbit-atlas/` with a clean console.

### Checkpoint 1 approval — 2026-10-17

- User approved Checkpoint 1 and authorized work to continue with Tasks 4-6.

### Task 4 — 2026-10-17

- RED: `npm test -- schemas` failed because the schema module did not exist. After implementation, the duplicate-object test still failed and exposed an incorrect uniqueness check; correcting it made all seven schema tests pass.
- `npm test -- schemas`, `npm run typecheck`, and the full `npm run verify` gate pass with 8 total tests.
- Zod 4.6.7 is pinned directly. The schemas enforce schema/protocol version 1, bounded values, safe relative paths, chronological ranges, unique IDs, source/event/asset relationships, and finite vectors. Public TypeScript contracts are derived with `z.infer`.

### Task 5 — 2026-10-17

- RED: `npm test -- datasetLoader` failed because checksum and loader modules did not exist. GREEN: five loader scenarios pass using real `Response`, Web Crypto, schema parsing, and an injected fetch boundary.
- Successful tests prove same-origin base-path resolution plus manifest, catalog, and ephemeris loading. Failure tests prove typed `HTTP_STATUS`, `CHECKSUM_MISMATCH`, `UNSUPPORTED_SCHEMA`, and `ABORTED` results.
- `npm test -- datasetLoader`, `npm run typecheck`, and the full `npm run verify` gate pass with 13 total tests. SHA-256 covers served bytes before JSON parsing.

### Task 6 — 2026-10-17

- RED: after aligning the filename with the documented test filter, `npm test -- workerProtocol` failed because the client and protocol modules did not exist. GREEN: five focused protocol tests pass.
- Tests cover all request variants, version/non-finite/size rejection, latest-generation delivery, transferable buffer identity, and stable malformed-message errors.
- `npm test -- workerProtocol`, `npm run typecheck`, and the full `npm run verify` gate pass with 18 total tests. `tasks/plan.md` records the concrete dataset, error, and worker contracts.

### Checkpoint 2 approval — 2026-10-17

- User approved Checkpoint 2 and authorized work to continue with Tasks 7-9.

### Task 7 — 2026-10-17

- RED: `npm test -- ephemeris` failed because the interpolation and UTC modules did not exist. A subsequent red test exposed invalid-time error precedence; parsing validity before checking an explicit offset resolved it.
- GREEN: five focused tests cover exact endpoints, missing segments, invalid and out-of-range times, explicit-offset UTC parsing, and held-out Earth/Sun ICRF vectors at the 1900 and 2100 boundaries.
- The held-out NASA/JPL Horizons midpoint fixtures pass per-axis tolerances of 2 km position and 0.0001 km/s velocity. Fixture provenance records target, center, frame, units, retrieval time, API URL, and the UT1/future-UTC limitation.
- `npm test -- ephemeris`, `npm run typecheck`, and `npm run verify` pass with 23 total tests and a clean production build.

### Task 8 — 2026-10-17

- RED: `npm test -- satellitePropagation` failed because the satellite module did not exist. The first implementation then failed the held-out cases and exposed a fixture transcription error; correcting the elements to the official Vallado case made the verification vectors pass.
- satellite.js 6.0.1 is pinned for OMM-to-SGP4 propagation. The adapter performs no network access and returns TEME km/km/s state plus signed element age and explicit `READY`, `STALE`, `OUT_OF_RANGE`, `INVALID_TIME`, `PROPAGATION_FAILED`, or `INVALID_STATE` results.
- Five focused tests cover Vallado case 00005 at epoch and +360 minutes (0.02 km and 0.00002 km/s per-axis tolerances), two-day staleness policy, validity, propagation failure, and non-finite output.
- `npm test -- satellitePropagation` and `npm run verify` pass with 28 total tests; the production build and dependency audit remain clean.

### Task 9 — 2026-10-17

- RED: `npm test -- frames renderTransform` failed because both transform modules were absent. The first TEME implementation then missed Vallado's position fixture by 0.68 km; correcting the inverse nutation rotation sign brought the published position and velocity into tolerance.
- Ten focused tests cover Vallado's TEME-to-J2000 example (0.05 km and 0.00005 km/s per-axis tolerances), Sun/Earth origin conversion, frame and scale round trips, non-mutation, relative distance/radius ratio, illustrative compression, finite-value rejection, Float32 output, and worker transfer-list identity.
- `tasks/plan.md` documents the fixed IAU-76/FK5 plus four-term IAU-80 adapter, frozen leap-second table, lack of live UT1/polar-motion/EOP corrections, source links, scale behavior, and the explicit non-navigation limitation.
- `npm test -- frames renderTransform` and `npm run verify` pass with 38 total tests and a clean production build.

### Checkpoint 3 approval — 2026-10-17

- User approved Checkpoint 3 and authorized work to continue with Tasks 10-12.
