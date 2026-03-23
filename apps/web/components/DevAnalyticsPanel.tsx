"use client";

import { useEffect, useState } from "react";
import { clearEventBuffer, getEventBuffer } from "@/lib/analytics";

const ANALYTICS_ENABLED =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "1";

export default function DevAnalyticsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState(getEventBuffer());

  useEffect(() => {
    if (!ANALYTICS_ENABLED) return;
    const interval = window.setInterval(() => {
      setEvents(getEventBuffer());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (!ANALYTICS_ENABLED) return null;

  const count = events.length;

  const handleRefresh = () => setEvents(getEventBuffer());
  const handleClear = () => {
    clearEventBuffer();
    setEvents([]);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
      <button
        type="button"
        className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-lg"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        Analytics ({count})
      </button>
      {isOpen ? (
        <div className="w-[360px] max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-semibold text-slate-900">Dev Analytics</div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50"
                onClick={handleRefresh}
              >
                Refresh
              </button>
              <button
                type="button"
                className="rounded border border-slate-200 px-2 py-1 text-slate-600 hover:bg-slate-50"
                onClick={handleClear}
              >
                Clear
              </button>
            </div>
          </div>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-50 p-2 text-[10px] text-slate-700">
            {JSON.stringify(events, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
