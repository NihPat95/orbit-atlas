const catalogPlaceholders = ["Planets", "Moons", "Comets", "Spacecraft"];

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
        <aside aria-label="Object catalog" className="panel catalog-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Explore</p>
              <h2>Object catalog</h2>
            </div>
            <span className="panel-count">25</span>
          </div>

          <label className="search-shell" htmlFor="catalog-search">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">Search the object catalog</span>
            <input
              disabled
              id="catalog-search"
              placeholder="Search objects"
              type="search"
            />
          </label>

          <nav aria-label="Catalog categories">
            <ul className="catalog-list">
              {catalogPlaceholders.map((category, index) => (
                <li className="catalog-list__item" key={category}>
                  <span
                    aria-hidden="true"
                    className={`catalog-dot catalog-dot--${index + 1}`}
                  />
                  <span>{category}</span>
                  <span className="catalog-list__dash" />
                </li>
              ))}
            </ul>
          </nav>

          <p className="panel-note">
            The catalog will appear after the first dataset is verified.
          </p>
        </aside>

        <section
          aria-busy="true"
          aria-label="Space map"
          className="scene-frame"
          role="region"
        >
          <div className="scene-meta scene-meta--left">
            <span>Sun-centered</span>
            <span>Illustrative scale</span>
          </div>
          <div className="scene-meta scene-meta--right">
            <span className="coordinate-readout">ICRF / J2000</span>
          </div>

          <div aria-hidden="true" className="orbital-loader">
            <span className="orbit orbit--outer" />
            <span className="orbit orbit--middle" />
            <span className="orbit orbit--inner" />
            <span className="sun-core" />
            <span className="loading-planet loading-planet--one" />
            <span className="loading-planet loading-planet--two" />
          </div>

          <div aria-live="polite" className="loading-message" role="status">
            <span className="loading-message__rule" />
            <div>
              <strong>Preparing the star map</strong>
              <span>Checking the catalog and motion data…</span>
            </div>
          </div>

          <div aria-hidden="true" className="timeline-placeholder">
            <span>1900</span>
            <span className="timeline-placeholder__track">
              <span className="timeline-placeholder__progress" />
            </span>
            <span>2100</span>
          </div>
        </section>

        <aside aria-label="Object details" className="panel details-panel">
          <p className="eyebrow">Selected object</p>
          <div aria-hidden="true" className="empty-orbit-icon">
            <span />
          </div>
          <h2>Nothing selected</h2>
          <p>
            Choose an object from the catalog or directly from the map to see
            its story, motion, and limitations.
          </p>
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
