import { useMemo, useState } from "react";

import { previewCatalog, previewValidityFor } from "./data/previewCatalog";
import { previewEvents } from "./data/previewEvents";
import { CatalogPanel } from "./features/catalog/CatalogPanel";
import { ObjectDetails } from "./features/details/ObjectDetails";
import {
  DisplayControls,
  type ReferenceFrame,
  type ScaleMode,
} from "./features/display/DisplayControls";
import { Timeline } from "./features/timeline/Timeline";
import { OrbitScene } from "./scene/OrbitScene";
import {
  explorationStore,
  useExplorationState,
} from "./state/explorationStore";
import {
  simulationClock,
  useSimulationClockState,
} from "./state/simulationClock";

function OrbitMark() {
  return (
    <svg aria-hidden="true" className="brand-mark" viewBox="0 0 40 40">
      <circle cx="20" cy="20" fill="currentColor" r="4" />
      <ellipse
        cx="20"
        cy="20"
        fill="none"
        rx="16"
        ry="7"
        stroke="currentColor"
      />
      <circle cx="33" cy="17" fill="currentColor" r="2" />
    </svg>
  );
}

export function App() {
  const exploration = useExplorationState();
  const clock = useSimulationClockState();
  const [referenceFrame, setReferenceFrame] =
    useState<ReferenceFrame>("SUN_CENTERED");
  const [scaleMode, setScaleMode] = useState<ScaleMode>("ILLUSTRATIVE");
  const selectedObject = previewCatalog.find(
    (object) => object.id === exploration.selectedId,
  );
  const validity = useMemo(
    () => previewValidityFor(exploration.selectedId),
    [exploration.selectedId],
  );
  const selectedEvents = useMemo(
    () =>
      previewEvents.filter(
        (event) => event.objectId === exploration.selectedId,
      ),
    [exploration.selectedId],
  );
  const objectErrors = useMemo<Readonly<Record<string, string>>>(() => {
    const failedId = new URLSearchParams(window.location.search).get(
      "failObject",
    );
    return failedId && previewCatalog.some(({ id }) => id === failedId)
      ? { [failedId]: "Motion asset missing" }
      : {};
  }, []);
  const availableObjects = useMemo(
    () => previewCatalog.filter(({ id }) => !objectErrors[id]),
    [objectErrors],
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <OrbitMark />
          <div>
            <p className="eyebrow">Interactive space map</p>
            <h1>Orbit Atlas</h1>
          </div>
        </div>

        <div className="system-state" aria-label="Application status">
          <span aria-hidden="true" className="system-state__signal" />
          Dataset preview
        </div>
      </header>

      <main className="workspace">
        <CatalogPanel
          objects={previewCatalog}
          objectErrors={objectErrors}
          onSelect={explorationStore.select}
          selectedId={exploration.selectedId}
        />

        <div className="map-column">
          <DisplayControls
            onReferenceFrameChange={setReferenceFrame}
            onScaleModeChange={setScaleMode}
            referenceFrame={referenceFrame}
            scaleMode={scaleMode}
          />
          <OrbitScene
            focusVersion={exploration.focusVersion}
            followingId={exploration.followingId}
            onSelect={explorationStore.select}
            objects={availableObjects}
            referenceFrame={referenceFrame}
            resetVersion={exploration.resetVersion}
            scaleMode={scaleMode}
            selectedId={exploration.selectedId}
            timeIsSupported={clock.dateStatus !== "UNSUPPORTED"}
            timeUtcMs={clock.timeUtcMs}
          />
          <Timeline
            clock={simulationClock}
            events={selectedEvents}
            validity={validity}
          />
        </div>

        <ObjectDetails
          following={exploration.followingId === selectedObject?.id}
          object={selectedObject}
          onRecenter={explorationStore.recenter}
          onReset={explorationStore.reset}
          onStopFollowing={explorationStore.stopFollowing}
          referenceFrame={referenceFrame}
          scaleMode={scaleMode}
          timeUtcMs={clock.timeUtcMs}
        />
      </main>
    </div>
  );
}
