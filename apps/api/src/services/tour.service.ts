import {
  PlanTourRequest,
  PlannedTour,
  Tour,
  TourStop,
  NormalizedListing,
} from '@project-x/shared-types';
import { generateTourNarrations } from './narration.service';
import * as tourRepo from '../repositories/tour.repository';
import { toApiTour } from './tour.mapper';

interface TourOptions {
  tenantId: string;
  userId?: string | null;
}

/**
 * Schedule stop times based on duration and buffer.
 * Pure function — same logic as the original in-memory version.
 */
function scheduleStops(
  stops: Array<{ listingId: string; address: string; lat: number; lng: number }>,
  date: string,
  startTime: string,
  defaultDurationMinutes: number,
  defaultBufferMinutes: number,
): Array<{
  listingId: string;
  order: number;
  address: string;
  lat: number;
  lng: number;
  thumbnailUrl: null;
  startTime: string;
  endTime: string;
}> {
  const startDate = new Date(`${date}T${startTime}:00`);
  if (Number.isNaN(startDate.getTime())) {
    throw new Error('Invalid startTime provided');
  }

  let current = startDate;
  return stops.map((stop, idx) => {
    const startIso = current.toISOString();
    const endDate = new Date(current);
    endDate.setMinutes(endDate.getMinutes() + defaultDurationMinutes);
    const endIso = endDate.toISOString();
    const nextStart = new Date(endDate);
    nextStart.setMinutes(nextStart.getMinutes() + defaultBufferMinutes);
    current = nextStart;

    return {
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
}

/**
 * Plan a tour. Optionally accepts listing data for rich narration generation.
 * If no listings provided, generates basic narrations from address only.
 */
export async function planTour(
  req: PlanTourRequest,
  options: TourOptions,
  listings?: Map<string, NormalizedListing>,
): Promise<PlannedTour> {
  const { date, startTime, defaultDurationMinutes, defaultBufferMinutes } = req;

  const scheduledStops = scheduleStops(
    req.stops,
    date,
    startTime,
    defaultDurationMinutes,
    defaultBufferMinutes,
  );

  // 1. Create tour + stops in DB first (no narrations yet — need real stop IDs)
  const dbTour = await tourRepo.create({
    tenantId: options.tenantId,
    userId: options.userId ?? null,
    title: req.clientName ? `${req.clientName}'s Tour` : 'Planned Tour',
    clientName: req.clientName ?? '',
    date,
    startTime,
    defaultDurationMinutes,
    defaultBufferMinutes,
    stops: scheduledStops,
  });

  // 2. Generate narrations using real stop IDs from the DB
  const realTourStops: TourStop[] = dbTour.stops.map((s) => ({
    id: s.id,
    listingId: s.listingId,
    order: s.order,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    thumbnailUrl: s.thumbnailUrl ?? null,
    startTime: s.startTime ?? undefined,
    endTime: s.endTime ?? undefined,
  }));
  const narrationPayloads = generateTourNarrations(
    { stops: realTourStops } as Tour,
    listings ?? new Map(),
  );

  // 3. Update the tour with the generated narration payloads
  const updatedTour = await tourRepo.update(dbTour.id, options.tenantId, {
    narrationPayloads,
  });

  return toApiTour(updatedTour ?? dbTour) as PlannedTour;
}

export async function getTourById(id: string, tenantId: string): Promise<Tour | undefined> {
  const dbTour = await tourRepo.findById(id, tenantId);
  return dbTour ? toApiTour(dbTour) : undefined;
}

export async function updateTour(
  id: string,
  tenantId: string,
  updates: Partial<Tour>,
): Promise<Tour | undefined> {
  // If stops were updated, recalculate times
  // First fetch existing to get scheduling params
  const existing = await tourRepo.findById(id, tenantId);
  if (!existing) return undefined;

  let stopsData: Array<{
    listingId: string;
    order: number;
    address: string;
    lat: number;
    lng: number;
    thumbnailUrl: string | null;
    startTime: string | null;
    endTime: string | null;
  }> | undefined;

  if (updates.stops) {
    const date = updates.date ?? existing.date;
    const startTimeStr = updates.startTime ?? existing.startTime;
    const duration = updates.defaultDurationMinutes ?? existing.defaultDurationMinutes;
    const buffer = updates.defaultBufferMinutes ?? existing.defaultBufferMinutes;

    const rescheduled = scheduleStops(
      updates.stops.map((s) => ({
        listingId: s.listingId,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
      })),
      date,
      startTimeStr,
      duration,
      buffer,
    );

    stopsData = rescheduled;
  }

  const dbTour = await tourRepo.update(id, tenantId, {
    title: updates.title,
    clientName: updates.clientName,
    date: updates.date,
    startTime: updates.startTime,
    defaultDurationMinutes: updates.defaultDurationMinutes,
    defaultBufferMinutes: updates.defaultBufferMinutes,
    narrationPayloads: updates.narrationPayloads,
    stops: stopsData,
  });

  return dbTour ? toApiTour(dbTour) : undefined;
}

export async function deleteTour(id: string, tenantId: string): Promise<boolean> {
  return tourRepo.deleteById(id, tenantId);
}

export async function listTours(options: TourOptions): Promise<Tour[]> {
  const dbTours = await tourRepo.findAll(options);
  return dbTours.map(toApiTour);
}
