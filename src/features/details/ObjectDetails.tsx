import type { PreviewObject } from "../../data/previewCatalog";
import { previewDetailsFor } from "../../data/previewDetails";
import type { ReferenceFrame, ScaleMode } from "../display/DisplayControls";

interface ObjectDetailsProps {
  object?: PreviewObject;
  following?: boolean;
  referenceFrame: ReferenceFrame;
  scaleMode: ScaleMode;
  timeUtcMs: number;
  onStopFollowing?: () => void;
  onRecenter?: () => void;
  onReset?: () => void;
}

export function ObjectDetails({
  object,
  following = false,
  referenceFrame,
  scaleMode,
  timeUtcMs,
  onStopFollowing,
  onRecenter,
  onReset,
}: ObjectDetailsProps) {
  if (!object) {
    return (
      <aside aria-label="Object details" className="panel details-panel">
        <p className="eyebrow">Selected object</p>
        <div aria-hidden="true" className="empty-orbit-icon">
          <span />
        </div>
        <h2>Nothing selected</h2>
        <p>
          Choose an object from the catalog or directly from the map to see its
          story, motion, and limitations.
        </p>
      </aside>
    );
  }

  const details = previewDetailsFor(object.id);
  const ageDays = Math.floor(
    (timeUtcMs - Date.parse(details.sourceEpochUtc)) / 86_400_000,
  );
  return (
    <aside aria-label="Object details" className="panel details-panel">
      <p className="eyebrow">Selected object</p>
      <div
        aria-hidden="true"
        className="selected-object-mark"
        style={{ backgroundColor: object.color }}
      />
      <h2>{object.canonicalName}</h2>
      <p data-testid="plain-summary">{details.summary}</p>
      <p className="follow-state">
        {following ? `Following ${object.canonicalName}` : "Free camera"}
      </p>
      {onStopFollowing || onRecenter || onReset ? (
        <div className="details-actions">
          {following ? (
            <button onClick={onStopFollowing} type="button">
              Stop following
            </button>
          ) : (
            <button onClick={onRecenter} type="button">
              Recenter {object.canonicalName}
            </button>
          )}
          <button onClick={onReset} type="button">
            Reset exploration
          </button>
        </div>
      ) : null}
      <details className="technical-details">
        <summary>Technical and orbital details</summary>
        <ul>
          {details.facts.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
        <dl className="metadata-preview">
          <div>
            <dt>Reference frame</dt>
            <dd>{frameLabel(referenceFrame)}</dd>
          </div>
          <div>
            <dt>Displayed scale</dt>
            <dd>{scaleLabel(scaleMode)}</dd>
          </div>
          <div>
            <dt>Preview confidence</dt>
            <dd>{details.confidence}</dd>
          </div>
          <div>
            <dt>Source epoch</dt>
            <dd>{details.sourceEpochUtc.slice(0, 10)} UTC</dd>
          </div>
          <div>
            <dt>Data age</dt>
            <dd>{ageDays} days</dd>
          </div>
          <div className="metadata-preview__stacked">
            <dt>Limitations</dt>
            <dd>{details.limitations}</dd>
          </div>
        </dl>
      </details>
    </aside>
  );
}

function frameLabel(frame: ReferenceFrame): string {
  return frame === "SUN_CENTERED" ? "Sun-centered" : "Earth-centered";
}

function scaleLabel(mode: ScaleMode): string {
  return mode === "ILLUSTRATIVE" ? "Illustrative" : "Relative";
}
