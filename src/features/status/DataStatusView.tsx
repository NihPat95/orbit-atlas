interface DataStatusViewProps {
  kind:
    "shell-loading" | "scene-loading" | "segment-loading" | "empty" | "error";
  message?: string;
  onRetry?: () => void;
}

const defaultMessages = {
  "shell-loading": "Loading the application shell…",
  "scene-loading": "Loading the space scene…",
  "segment-loading": "Loading motion segment…",
  empty: "No objects match this search.",
  error: "The requested data could not be loaded.",
} as const;

export function DataStatusView({
  kind,
  message,
  onRetry,
}: DataStatusViewProps) {
  return (
    <div className={`data-status data-status--${kind}`} role="status">
      <span>{message ?? defaultMessages[kind]}</span>
      {kind === "error" && onRetry ? (
        <button onClick={onRetry} type="button">
          Retry
        </button>
      ) : null}
    </div>
  );
}
