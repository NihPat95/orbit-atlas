export type ReferenceFrame = "SUN_CENTERED" | "EARTH_CENTERED";
export type ScaleMode = "ILLUSTRATIVE" | "RELATIVE";

interface DisplayControlsProps {
  referenceFrame: ReferenceFrame;
  scaleMode: ScaleMode;
  onReferenceFrameChange: (frame: ReferenceFrame) => void;
  onScaleModeChange: (mode: ScaleMode) => void;
}

export function DisplayControls({
  referenceFrame,
  scaleMode,
  onReferenceFrameChange,
  onScaleModeChange,
}: DisplayControlsProps) {
  return (
    <div
      aria-label="Display controls"
      className="display-controls"
      role="group"
    >
      <label>
        <span>Reference frame</span>
        <select
          aria-label="Reference frame"
          onChange={(event) =>
            onReferenceFrameChange(event.target.value as ReferenceFrame)
          }
          value={referenceFrame}
        >
          <option value="SUN_CENTERED">Sun-centered</option>
          <option value="EARTH_CENTERED">Earth-centered</option>
        </select>
      </label>
      <label>
        <span>Displayed scale</span>
        <select
          aria-label="Displayed scale"
          onChange={(event) =>
            onScaleModeChange(event.target.value as ScaleMode)
          }
          value={scaleMode}
        >
          <option value="ILLUSTRATIVE">Illustrative</option>
          <option value="RELATIVE">Relative</option>
        </select>
      </label>
    </div>
  );
}
