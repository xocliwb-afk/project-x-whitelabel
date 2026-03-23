"use client";

import { useMemo } from "react";
import { useTourStore } from "@/stores/useTourStore";

function formatTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function TourBuilderClient() {
  const { tour, isPlanning, planError, actions } = useTourStore((state) => ({
    tour: state.tour,
    isPlanning: state.isPlanning,
    planError: state.planError,
    actions: state.actions,
  }));

  const sortedStops = useMemo(
    () => (tour ? [...tour.stops].sort((a, b) => a.order - b.order) : []),
    [tour],
  );

  const hasStops = sortedStops.length > 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Tour Builder</h1>
        <p className="text-sm text-text-main/70">
          Build a simple route by selecting listings and setting a start time.
        </p>
      </div>

      <div className="grid gap-4 rounded-lg border border-border bg-surface p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Title
            <input
              className="rounded border border-border bg-surface px-2 py-1 text-text-main"
              value={tour?.title ?? ""}
              onChange={(e) => actions.setTourMeta({ title: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Client
            <input
              className="rounded border border-border bg-surface px-2 py-1 text-text-main"
              value={tour?.clientName ?? ""}
              onChange={(e) => actions.setTourMeta({ clientName: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Date
            <input
              type="date"
              className="rounded border border-border bg-surface px-2 py-1 text-text-main"
              value={tour?.date ?? ""}
              onChange={(e) => actions.setTourMeta({ date: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Start time
            <input
              type="time"
              className="rounded border border-border bg-surface px-2 py-1 text-text-main"
              value={tour?.startTime ?? ""}
              onChange={(e) => actions.setTourMeta({ startTime: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Duration (min)
            <input
              type="number"
              className="rounded border border-border bg-surface px-2 py-1 text-text-main"
              value={tour?.defaultDurationMinutes ?? 30}
              onChange={(e) =>
                actions.setTourMeta({ defaultDurationMinutes: Number(e.target.value) || 0 })
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Buffer (min)
            <input
              type="number"
              className="rounded border border-border bg-surface px-2 py-1 text-text-main"
              value={tour?.defaultBufferMinutes ?? 15}
              onChange={(e) =>
                actions.setTourMeta({ defaultBufferMinutes: Number(e.target.value) || 0 })
              }
            />
          </label>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-main">Tour Stops</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => actions.planTourServerSide()}
              disabled={isPlanning || !hasStops}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPlanning ? "Planning..." : "Plan Tour"}
            </button>
            <button
              type="button"
              onClick={() => {
                const url = actions.buildGoogleMapsRouteUrl();
                if (url) {
                  window.open(url, "_blank", "noopener,noreferrer");
                }
              }}
              disabled={!hasStops}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-text-main hover:bg-surface-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              Open in Google Maps
            </button>
            <button
              type="button"
              onClick={() => actions.clearTour()}
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
            {sortedStops.map((stop, idx) => (
              <li
                key={stop.id}
                className="flex items-center justify-between rounded border border-border bg-surface-muted px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-semibold text-text-main">
                    Stop {idx + 1}: {stop.address}
                  </p>
                  {stop.startTime && stop.endTime && (
                    <p className="text-xs text-text-muted">
                      {formatTime(stop.startTime)} – {formatTime(stop.endTime)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => actions.reorderStops(idx, idx - 1)}
                      className="rounded-full border border-border px-2 py-1 text-xs text-text-main hover:bg-surface-accent"
                    >
                      ↑
                    </button>
                  )}
                  {idx < sortedStops.length - 1 && (
                    <button
                      type="button"
                      onClick={() => actions.reorderStops(idx, idx + 1)}
                      className="rounded-full border border-border px-2 py-1 text-xs text-text-main hover:bg-surface-accent"
                    >
                      ↓
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => actions.removeStop(stop.id)}
                    className="text-xs font-semibold text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {planError && (
          <p className="mt-3 text-sm text-red-500">{planError}</p>
        )}
      </div>
    </div>
  );
}
