"use client";

import { create } from "zustand";
import type { NormalizedListing } from "@project-x/shared-types";
import type { LatLngBoundsTuple } from "@/components/map/types";

type MapLensState = {
  activeClusterData: null | {
    listings: NormalizedListing[];
    anchorLatLng: { lat: number; lng: number };
    bounds?: LatLngBoundsTuple;
    clusterKey?: string;
  };
  activateLens: (data: NonNullable<MapLensState["activeClusterData"]>) => void;
  dismissLens: () => void;
  isLocked: boolean;
  setLocked: (isLocked: boolean) => void;
  lockLens: () => void;
  focusedListingId: string | null;
  setFocusedListingId: (id: string | null) => void;
};

export const useMapLensStore = create<MapLensState>((set) => ({
  activeClusterData: null,
  isLocked: false,
  focusedListingId: null,
  setLocked: (isLocked) => set({ isLocked }),
  lockLens: () => set({ isLocked: true }),
  activateLens: (data) => {
    set({ activeClusterData: data, focusedListingId: null });
  },
  dismissLens: () => {
    set({ activeClusterData: null, isLocked: false, focusedListingId: null });
  },
  setFocusedListingId: (id) => set({ focusedListingId: id }),
}));
