'use client';

import { useMemo } from 'react';
import { useTourStore } from '@/stores/useTourStore';
import { TourStopCard } from './TourStopCard';

type TourPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function TourPanel({ isOpen, onClose }: TourPanelProps) {
  const { tour, actions, isPlanning, planError } = useTourStore((state) => ({
    tour: state.tour,
    actions: state.actions,
    isPlanning: state.isPlanning,
    planError: state.planError,
  }));

  const sortedStops = useMemo(
    () => (tour ? [...tour.stops].sort((a, b) => a.order - b.order) : []),
    [tour],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md border-l border-border bg-surface shadow-xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-text-muted">
            Tour Planner
          </div>
          <div className="text-lg font-bold text-text-main">
            {tour?.title || "Today's Tour"}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-border px-3 py-1 text-sm font-medium text-text-main hover:bg-surface-accent"
        >
          Close
        </button>
      </div>

      <div className="flex h-[calc(100%-52px)] flex-col gap-4 overflow-y-auto p-4">
        {!tour || sortedStops.length === 0 ? (
          <p className="text-sm text-text-muted">Your tour is empty.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="flex flex-col gap-1 text-xs text-text-muted">
                Title
                <input
                  className="rounded border border-border bg-surface px-2 py-1 text-text-main"
                  value={tour.title}
                  onChange={(e) => actions.setTourMeta({ title: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-text-muted">
                Client
                <input
                  className="rounded border border-border bg-surface px-2 py-1 text-text-main"
                  value={tour.clientName}
                  onChange={(e) => actions.setTourMeta({ clientName: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-text-muted">
                Date
                <input
                  type="date"
                  className="rounded border border-border bg-surface px-2 py-1 text-text-main"
                  value={tour.date}
                  onChange={(e) => actions.setTourMeta({ date: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-text-muted">
                Start time
                <input
                  type="time"
                  className="rounded border border-border bg-surface px-2 py-1 text-text-main"
                  value={tour.startTime}
                  onChange={(e) => actions.setTourMeta({ startTime: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-text-muted">
                Duration (min)
                <input
                  type="number"
                  className="rounded border border-border bg-surface px-2 py-1 text-text-main"
                  value={tour.defaultDurationMinutes}
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
                  value={tour.defaultBufferMinutes}
                  onChange={(e) =>
                    actions.setTourMeta({ defaultBufferMinutes: Number(e.target.value) || 0 })
                  }
                />
              </label>
            </div>

            <div className="space-y-3">
              {sortedStops.map((stop, idx) => (
                <TourStopCard
                  key={stop.id}
                  stop={stop}
                  index={idx}
                  onRemove={() => actions.removeStop(stop.id)}
                  onMoveUp={idx > 0 ? () => actions.reorderStops(idx, idx - 1) : undefined}
                  onMoveDown={
                    idx < sortedStops.length - 1
                      ? () => actions.reorderStops(idx, idx + 1)
                      : undefined
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <button
          type="button"
          className="rounded-full border border-border px-3 py-1 text-sm font-medium text-text-main hover:bg-surface/80 disabled:opacity-60"
          onClick={() => actions.planTourServerSide()}
          disabled={isPlanning || !tour || sortedStops.length === 0}
        >
          {isPlanning ? 'Planning…' : 'Compute schedule'}
        </button>
        {planError && <p className="text-sm text-red-500">{planError}</p>}
        <button
          type="button"
          className="rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          onClick={() => {
            const url = actions.buildGoogleMapsRouteUrl();
            if (url) {
              window.open(url, '_blank', 'noopener,noreferrer');
            }
          }}
          disabled={!tour || sortedStops.length === 0}
        >
          Open in Google Maps
        </button>
      </div>
    </div>
  );
}
