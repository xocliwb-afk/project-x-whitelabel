'use client';

import type { TourStop } from '@project-x/shared-types';

type TourStopCardProps = {
  stop: TourStop;
  index: number;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
};

function formatTime(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function TourStopCard({
  stop,
  index,
  onRemove,
  onMoveUp,
  onMoveDown,
}: TourStopCardProps) {
  const start = formatTime(stop.startTime);
  const end = formatTime(stop.endTime);

  return (
    <div className="flex items-start justify-between rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-1 flex-col gap-1">
        <div className="text-xs font-semibold text-text-main">Stop {index + 1}</div>
        <div className="text-sm text-text-main">{stop.address}</div>
        {start && end && (
          <div className="text-[11px] text-text-muted">
            {start} – {end}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="flex gap-1">
          {onMoveUp && (
            <button
              type="button"
              onClick={onMoveUp}
              className="rounded-full border border-border px-2 py-1 text-[11px] text-text-main hover:bg-surface/80"
            >
              ↑
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              onClick={onMoveDown}
              className="rounded-full border border-border px-2 py-1 text-[11px] text-text-main hover:bg-surface/80"
            >
              ↓
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full border border-destructive/50 px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
