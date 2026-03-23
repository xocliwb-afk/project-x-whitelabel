"use client";

import { useLeadModalStore } from "@/stores/useLeadModalStore";

type ContactAgentPanelProps = {
  listingId: string;
  listingAddress?: string;
};

export default function ContactAgentPanel({
  listingId,
  listingAddress,
}: ContactAgentPanelProps) {
  const open = useLeadModalStore((s) => s.open);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold">Schedule a tour</h2>
      <p className="text-sm text-slate-600">
        Share your info and we&apos;ll follow up to plan a visit.
      </p>
      <button
        type="button"
        onClick={() =>
          open({
            intent: "schedule-showing",
            entrySource: "listing-detail-panel",
            listingId,
            listingAddress,
          })
        }
        className="mt-4 w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Schedule a tour
      </button>
    </div>
  );
}
