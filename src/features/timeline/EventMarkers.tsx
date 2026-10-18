import type { NotableEvent } from "../../domain/types";
import type { TimeValidity } from "../../state/simulationClock";

interface EventMarkersProps {
  events: readonly Pick<
    NotableEvent,
    "id" | "objectId" | "title" | "explanation" | "occurredAtUtc"
  >[];
  validity: TimeValidity;
  onMoveTo: (timeUtcMs: number) => void;
}

export function EventMarkers({
  events,
  validity,
  onMoveTo,
}: EventMarkersProps) {
  if (!events.length) return null;
  return (
    <div aria-label="Notable events" className="event-markers">
      {events.map((event) => {
        const timeUtcMs = Date.parse(event.occurredAtUtc);
        const isSupported =
          timeUtcMs >= validity.fromUtcMs && timeUtcMs <= validity.toUtcMs;
        const descriptionId = `${event.id}-description`;
        return (
          <button
            aria-describedby={descriptionId}
            disabled={!isSupported}
            key={event.id}
            onClick={() => onMoveTo(timeUtcMs)}
            type="button"
          >
            <span>{event.title}</span>
            <time dateTime={event.occurredAtUtc}>
              {new Date(timeUtcMs).getUTCFullYear()}
            </time>
            <span className="sr-only" id={descriptionId}>
              {event.explanation}
              {!isSupported
                ? " Context only—outside motion coverage."
                : " Move the simulation to this date."}
            </span>
          </button>
        );
      })}
    </div>
  );
}
