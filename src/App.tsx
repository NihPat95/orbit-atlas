import { previewCatalog } from "./data/previewCatalog";
import { CatalogPanel } from "./features/catalog/CatalogPanel";
import { OrbitScene } from "./scene/OrbitScene";
import {
  explorationStore,
  useExplorationState,
} from "./state/explorationStore";

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
  const selectedObject = previewCatalog.find(
    (object) => object.id === exploration.selectedId,
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
          onSelect={explorationStore.select}
          selectedId={exploration.selectedId}
        />

        <OrbitScene
          focusVersion={exploration.focusVersion}
          followingId={exploration.followingId}
          onSelect={explorationStore.select}
          resetVersion={exploration.resetVersion}
          selectedId={exploration.selectedId}
        />

        <aside aria-label="Object details" className="panel details-panel">
          <p className="eyebrow">Selected object</p>
          {selectedObject ? (
            <>
              <div
                aria-hidden="true"
                className="selected-object-mark"
                style={{ backgroundColor: selectedObject.color }}
              />
              <h2>{selectedObject.canonicalName}</h2>
              <p>
                {exploration.followingId === selectedObject.id
                  ? `Following ${selectedObject.canonicalName}`
                  : "Free camera"}
              </p>
              <div className="details-actions">
                {exploration.followingId ? (
                  <button
                    onClick={explorationStore.stopFollowing}
                    type="button"
                  >
                    Stop following
                  </button>
                ) : (
                  <button onClick={explorationStore.recenter} type="button">
                    Recenter {selectedObject.canonicalName}
                  </button>
                )}
                <button onClick={explorationStore.reset} type="button">
                  Reset exploration
                </button>
              </div>
            </>
          ) : (
            <>
              <div aria-hidden="true" className="empty-orbit-icon">
                <span />
              </div>
              <h2>Nothing selected</h2>
              <p>
                Choose an object from the catalog or directly from the map to
                see its story, motion, and limitations.
              </p>
            </>
          )}
          <dl className="metadata-preview">
            <div>
              <dt>Reference frame</dt>
              <dd>Sun-centered</dd>
            </div>
            <div>
              <dt>Displayed scale</dt>
              <dd>Illustrative</dd>
            </div>
          </dl>
        </aside>
      </main>
    </div>
  );
}
