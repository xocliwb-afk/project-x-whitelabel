'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { produce } from 'immer';
import type {
  NormalizedListing,
  PlanTourRequest,
  Tour,
  TourStop,
} from '@project-x/shared-types';
import { planTourApi } from '@/lib/api-client';

type TourMetaFields = Partial<
  Pick<
    Tour,
    | 'title'
    | 'clientName'
    | 'date'
    | 'startTime'
    | 'defaultDurationMinutes'
    | 'defaultBufferMinutes'
  >
>;

type TourState = {
  tour: Tour | null;
  isPlanning: boolean;
  planError: string | null;
  actions: {
    addStopFromListing: (listing: NormalizedListing) => void;
    removeStop: (stopId: string) => void;
    reorderStops: (fromIndex: number, toIndex: number) => void;
    setTourMeta: (meta: TourMetaFields) => void;
    computeStopTimes: () => void;
    buildGoogleMapsRouteUrl: () => string | null;
    planTourServerSide: () => Promise<void>;
    clearTour: () => void;
  };
};

const makeId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `tour-${Math.random().toString(36).slice(2, 10)}`;
};

const defaultTour = (): Tour => {
  const today = new Date();
  const date = today.toISOString().slice(0, 10);
  return {
    id: makeId(),
    title: "Today's Tour",
    clientName: '',
    date,
    startTime: '10:00',
    defaultDurationMinutes: 30,
    defaultBufferMinutes: 15,
    stops: [],
  };
};

export const useTourStore = create<TourState>()(
  persist(
    (set, get) => ({
      tour: null,
      isPlanning: false,
      planError: null,
      actions: {
        addStopFromListing: (listing) => {
          set(
            produce<TourState>((state) => {
              if (!state.tour) {
                state.tour = defaultTour();
              }
              if (state.tour.stops.some((s) => s.listingId === listing.id)) {
                return;
              }
              const nextOrder = state.tour.stops.length;
              const stop: TourStop = {
                id: makeId(),
                listingId: listing.id,
                order: nextOrder,
                address: listing.address?.full ?? 'Address unavailable',
                lat: listing.address?.lat ?? 0,
                lng: listing.address?.lng ?? 0,
                thumbnailUrl:
                  listing.media?.thumbnailUrl ??
                  listing.media?.photos?.[0] ??
                  null,
              };
              state.tour.stops.push(stop);
            }),
          );
        },
        planTourServerSide: async () => {
          const currentTour = get().tour;
          if (!currentTour || currentTour.stops.length === 0) {
            set({ planError: 'Add at least one stop to plan a tour.', isPlanning: false });
            return;
          }

          set({ isPlanning: true, planError: null });

          try {
            const sortedStops = [...currentTour.stops].sort((a, b) => a.order - b.order);
            const timeZone =
              typeof Intl !== 'undefined'
                ? Intl.DateTimeFormat().resolvedOptions().timeZone
                : undefined;

            const payload: PlanTourRequest = {
              date: currentTour.date || new Date().toISOString().slice(0, 10),
              clientName: currentTour.clientName || undefined,
              startTime: currentTour.startTime || '09:00',
              defaultDurationMinutes: currentTour.defaultDurationMinutes ?? 30,
              defaultBufferMinutes: currentTour.defaultBufferMinutes ?? 10,
              timeZone,
              stops: sortedStops.map((stop) => ({
                listingId: stop.listingId,
                address: stop.address,
                lat: stop.lat,
                lng: stop.lng,
              })),
            };

            const plannedTour = await planTourApi(payload);
            set({ tour: plannedTour, isPlanning: false, planError: null });
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Failed to plan tour. Please try again.';
            set({ isPlanning: false, planError: message });
          }
        },
        removeStop: (stopId) => {
          set(
            produce<TourState>((state) => {
              if (!state.tour) return;
              state.tour.stops = state.tour.stops
                .filter((s) => s.id !== stopId)
                .map((s, idx) => ({ ...s, order: idx }));
            }),
          );
        },
        reorderStops: (fromIndex, toIndex) => {
          set(
            produce<TourState>((state) => {
              if (!state.tour) return;
              const stops = state.tour.stops;
              if (
                fromIndex < 0 ||
                toIndex < 0 ||
                fromIndex >= stops.length ||
                toIndex >= stops.length
              ) {
                return;
              }
              const [moved] = stops.splice(fromIndex, 1);
              stops.splice(toIndex, 0, moved);
              state.tour.stops = stops.map((s, idx) => ({ ...s, order: idx }));
            }),
          );
        },
        setTourMeta: (meta) => {
          set(
            produce<TourState>((state) => {
              if (!state.tour) {
                state.tour = defaultTour();
              }
              state.tour = { ...state.tour, ...meta };
            }),
          );
        },
        computeStopTimes: () => {
          set(
            produce<TourState>((state) => {
              if (!state.tour || state.tour.stops.length === 0) return;
              const { date, startTime, defaultDurationMinutes, defaultBufferMinutes } = state.tour;
              const startDate = new Date(`${date}T${startTime}:00`);
              if (Number.isNaN(startDate.getTime())) return;
              let current = startDate;

              state.tour.stops.forEach((stop) => {
                const startIso = current.toISOString();
                const endDate = new Date(current);
                endDate.setMinutes(endDate.getMinutes() + defaultDurationMinutes);
                const endIso = endDate.toISOString();
                const nextStart = new Date(endDate);
                nextStart.setMinutes(nextStart.getMinutes() + defaultBufferMinutes);
                current = nextStart;
                stop.startTime = startIso;
                stop.endTime = endIso;
              });
            }),
          );
        },
        buildGoogleMapsRouteUrl: () => {
          const tour = get().tour;
          if (!tour || tour.stops.length === 0) return null;
          const stops = [...tour.stops].sort((a, b) => a.order - b.order);
          const origin = `${stops[0].lat},${stops[0].lng}`;
          let destination = origin;
          let waypoints = '';
          if (stops.length > 1) {
            destination = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;
          }
          if (stops.length > 2) {
            waypoints = stops
              .slice(1, -1)
              .map((s) => `${s.lat},${s.lng}`)
              .join('|');
          }

          const params = new URLSearchParams({
            api: '1',
            origin,
            destination,
            travelmode: 'driving',
          });
          if (waypoints) {
            params.set('waypoints', waypoints);
          }
          return `https://www.google.com/maps/dir/?${params.toString()}`;
        },
        clearTour: () => set({ tour: null }),
      },
    }),
    { name: 'project-x-tour' },
  ),
);
