"use client";

import { useMemo } from "react";
import { useTourStore } from "@/src/stores/useTourStore";

function formatInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function formatIsoDisplay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

function formatIsoDisplaySafe(value?: string) {
  if (!value) return "—";
  return formatIsoDisplay(value);
}

export default function TourBuilderClient() {
  const {
    stops,
    startTime,
    travelTimeMinutes,
    plannedTour,
    isLoading,
    error,
    setStartTime,
    setTravelTimeMinutes,
    planTour,
    removeStop,
    clearTour,
  } = useTourStore((state) => state);

  const hasStops = stops.length > 0;
  const planDisabled = isLoading || !startTime || !hasStops;

  const formattedStartInput = useMemo(
    () => formatInputValue(startTime),
    [startTime]
  );

  const totalDurationMinutes =
    plannedTour?.stops.reduce((sum, stop) => {
      const dur = (stop as any).durationMinutes ?? plannedTour.defaultDurationMinutes;
      const buf = (stop as any).bufferMinutes ?? plannedTour.defaultBufferMinutes;
      return sum + dur + buf;
    }, 0) ?? 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Tour Builder</h1>
        <p className="text-sm text-text-main/70">
          Build a simple route by selecting listings and setting a start time.
        </p>
      </div>

      <div className="grid gap-4 rounded-lg border border-border bg-surface p-4">
        <label className="flex flex-col gap-2 text-sm text-text-main">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-main/70">
            Start time (UTC)
          </span>
          <input
            type="datetime-local"
            value={formattedStartInput}
            onChange={(e) =>
              setStartTime(
                e.target.value ? new Date(e.target.value).toISOString() : null
              )
            }
            className="rounded border border-border bg-white/5 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-text-main">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-main/70">
            Travel time between stops (minutes)
          </span>
          <input
            type="number"
            min={0}
            value={travelTimeMinutes}
            onChange={(e) => setTravelTimeMinutes(Number(e.target.value))}
            className="w-32 rounded border border-border bg-white/5 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-main">Tour Stops</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={planTour}
              disabled={planDisabled}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Planning..." : "Plan Tour"}
            </button>
            <button
              type="button"
              onClick={clearTour}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-text-main hover:bg-surface-accent"
            >
              Clear
            </button>
          </div>
        </div>

        {!hasStops && (
          <p className="text-sm text-text-main/70">
            No stops added yet. Use &quot;Add to Tour&quot; on a listing card to
            build your route.
          </p>
        )}

        {hasStops && (
          <ul className="flex flex-col gap-3">
            {stops.map((stop, idx) => (
              <li
                key={stop.listingId}
                className="flex items-center justify-between rounded border border-border bg-surface-muted px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-semibold text-text-main">
                    Stop {idx + 1}: {stop.address}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeStop(stop.listingId)}
                  className="text-xs font-semibold text-red-500 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-500">
            {error}
          </p>
        )}
      </div>

      {plannedTour && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-text-main">Planned Tour</h3>
            <p className="text-xs text-text-main/60">
              Total duration: {totalDurationMinutes} minutes
            </p>
          </div>
          <div className="mb-3 text-sm text-text-main/80">
            <p>Start: {formatIsoDisplay(plannedTour.startTime)}</p>
            <p>
              End: {formatIsoDisplaySafe(plannedTour.stops.at(-1)?.endTime)}
            </p>
          </div>
          <div className="mt-4 space-y-2">
            {plannedTour.stops.map((stop) => (
              <div
                key={stop.listingId + stop.startTime}
                className="rounded border border-border bg-surface-muted p-3 text-sm"
              >
                <p className="font-semibold text-text-main">{stop.address}</p>
                <p className="text-xs text-text-main/60">
                  {formatIsoDisplaySafe(stop.startTime)} →{" "}
                  {formatIsoDisplaySafe(stop.endTime)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
