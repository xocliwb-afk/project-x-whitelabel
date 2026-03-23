"use client";

import { create } from "zustand";
import { trackEvent } from "@/lib/analytics";

export type Intent = "schedule-showing" | "get-details" | "talk-to-brandon";

type LeadModalState = {
  isOpen: boolean;
  intent?: Intent;
  entrySource?: string;
  listingId?: string;
  listingAddress?: string;
  open: (payload?: {
    intent?: Intent;
    entrySource?: string;
    listingId?: string;
    listingAddress?: string;
  }) => void;
  close: () => void;
  setIntent: (intent: Intent) => void;
};

export const useLeadModalStore = create<LeadModalState>((set) => ({
  isOpen: false,
  intent: undefined,
  entrySource: undefined,
  listingId: undefined,
  listingAddress: undefined,
  open: (payload) => {
    trackEvent("lead_modal_open", {
      intent: payload?.intent,
      entry_source: payload?.entrySource,
      listing_id: payload?.listingId,
    });
    set({
      isOpen: true,
      intent: payload?.intent,
      entrySource: payload?.entrySource,
      listingId: payload?.listingId,
      listingAddress: payload?.listingAddress,
    });
  },
  close: () =>
    set({
      isOpen: false,
      intent: undefined,
      entrySource: undefined,
      listingId: undefined,
      listingAddress: undefined,
    }),
  setIntent: (intent) => set((state) => ({ ...state, intent })),
}));
