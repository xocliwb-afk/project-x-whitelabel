import {
  PlanTourRequest,
  PlannedTour,
  Tour,
  TourStop,
  NormalizedListing,
} from '@project-x/shared-types';
import { generateTourNarrations } from './narration.service';

const makeId = () => `tour-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** In-memory tour store — persists across requests within a server session. */
const tourStore = new Map<string, Tour>();

/**
 * Plan a tour. Optionally accepts listing data for rich narration generation.
 * If no listings provided, generates basic narrations from address only.
 */
export function planTour(
  req: PlanTourRequest,
  listings?: Map<string, NormalizedListing>,
): PlannedTour {
  const { date, startTime, defaultDurationMinutes, defaultBufferMinutes } = req;
  const startDate = new Date(`${date}T${startTime}:00`);
  if (Number.isNaN(startDate.getTime())) {
    throw new Error('Invalid startTime provided');
  }

  let current = startDate;
  const stops: TourStop[] = req.stops.map((stop: any, idx: number) => {
    const startIso = current.toISOString();
    const endDate = new Date(current);
    endDate.setMinutes(endDate.getMinutes() + defaultDurationMinutes);
    const endIso = endDate.toISOString();
    const nextStart = new Date(endDate);
    nextStart.setMinutes(nextStart.getMinutes() + defaultBufferMinutes);
    current = nextStart;

    return {
      id: makeId(),
      listingId: stop.listingId,
      order: idx,
      address: stop.address,
      lat: stop.lat,
      lng: stop.lng,
      thumbnailUrl: null,
      startTime: startIso,
      endTime: endIso,
    };
  });

  const tour: Tour = {
    id: makeId(),
    title: req.clientName ? `${req.clientName}'s Tour` : "Planned Tour",
    clientName: req.clientName ?? '',
    date: req.date,
    startTime: req.startTime,
    defaultDurationMinutes,
    defaultBufferMinutes,
    stops,
    narrationPayloads: generateTourNarrations(
      { stops } as Tour,
      listings ?? new Map(),
    ),
  };

  tourStore.set(tour.id, tour);
  return tour as PlannedTour;
}

export function getTourById(id: string): Tour | undefined {
  return tourStore.get(id);
}

export function updateTour(id: string, updates: Partial<Tour>): Tour | undefined {
  const existing = tourStore.get(id);
  if (!existing) return undefined;

  const updated: Tour = {
    ...existing,
    ...updates,
    id: existing.id, // ID is immutable
  };

  // If stops were updated, recalculate times
  if (updates.stops) {
    const { date, startTime, defaultDurationMinutes, defaultBufferMinutes } = updated;
    const startDate = new Date(`${date}T${startTime}:00`);
    if (!Number.isNaN(startDate.getTime())) {
      let current = startDate;
      updated.stops = updated.stops.map((stop, idx) => {
        const startIso = current.toISOString();
        const endDate = new Date(current);
        endDate.setMinutes(endDate.getMinutes() + defaultDurationMinutes);
        const endIso = endDate.toISOString();
        const nextStart = new Date(endDate);
        nextStart.setMinutes(nextStart.getMinutes() + defaultBufferMinutes);
        current = nextStart;

        return { ...stop, order: idx, startTime: startIso, endTime: endIso };
      });
    }
  }

  tourStore.set(id, updated);
  return updated;
}

export function deleteTour(id: string): boolean {
  return tourStore.delete(id);
}

export function listTours(): Tour[] {
  return Array.from(tourStore.values());
}
