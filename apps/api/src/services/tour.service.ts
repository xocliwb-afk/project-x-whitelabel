import {
  PlanTourRequest,
  PlannedTour,
  Tour,
  TourStop,
  NormalizedListing,
  UserRole,
} from '@project-x/shared-types';
import { Prisma, prisma } from '@project-x/database';
import { generateTourNarrations } from './narration.service';
import * as tourRepo from '../repositories/tour.repository';
import { toApiTour } from './tour.mapper';
import { createHttpError } from '../utils/http-error';

interface TourOptions {
  tenantId: string;
  userId: string;
  role: UserRole;
}

/**
 * Schedule stop times based on duration and buffer.
 * Pure function — same logic as the original in-memory version.
 */
function scheduleStops(
  stops: Array<{
    id?: string;
    listingId: string;
    address: string;
    lat: number;
    lng: number;
    thumbnailUrl?: string | null;
  }>,
  date: string,
  startTime: string,
  defaultDurationMinutes: number,
  defaultBufferMinutes: number,
): Array<{
  id?: string;
  listingId: string;
  order: number;
  address: string;
  lat: number;
  lng: number;
  thumbnailUrl: string | null;
  startTime: string;
  endTime: string;
  }> {
  const startDate = new Date(`${date}T${startTime}:00`);
  if (Number.isNaN(startDate.getTime())) {
    throw createHttpError(400, 'Invalid startTime provided');
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
      id: stop.id,
      listingId: stop.listingId,
      order: idx,
      address: stop.address,
      lat: stop.lat,
      lng: stop.lng,
      thumbnailUrl: stop.thumbnailUrl ?? null,
      startTime: startIso,
      endTime: endIso,
    };
  });
}

function shouldRescheduleTour(updates: Partial<Tour>): boolean {
  return (
    updates.stops !== undefined ||
    updates.date !== undefined ||
    updates.startTime !== undefined ||
    updates.defaultDurationMinutes !== undefined ||
    updates.defaultBufferMinutes !== undefined
  );
}

function resolveUpdatedStops(
  incomingStops: TourStop[] | undefined,
  existingStops: TourStop[],
): Array<{
  id?: string;
  listingId: string;
  address: string;
  lat: number;
  lng: number;
  thumbnailUrl?: string | null;
}> {
  if (!incomingStops) {
    return existingStops.map((stop) => ({
      id: stop.id,
      listingId: stop.listingId,
      address: stop.address,
      lat: stop.lat,
      lng: stop.lng,
      thumbnailUrl: stop.thumbnailUrl ?? null,
    }));
  }

  const existingStopsById = new Map(existingStops.map((stop) => [stop.id, stop]));
  return incomingStops.map((stop) => {
    const existingStop = existingStopsById.get(stop.id);
    return {
      id: existingStop?.id,
      listingId: stop.listingId,
      address: stop.address,
      lat: stop.lat,
      lng: stop.lng,
      thumbnailUrl: stop.thumbnailUrl ?? existingStop?.thumbnailUrl ?? null,
    };
  });
}

async function syncTourStops(
  tx: Prisma.TransactionClient,
  tourId: string,
  existingStops: TourStop[],
  scheduledStops: Array<{
    id?: string;
    listingId: string;
    order: number;
    address: string;
    lat: number;
    lng: number;
    thumbnailUrl?: string | null;
    startTime: string;
    endTime: string;
  }>,
  replaceMissingStops: boolean,
): Promise<void> {
  const existingStopIds = new Set(existingStops.map((stop) => stop.id));
  const preservedStopIds = scheduledStops
    .map((stop) => stop.id)
    .filter((stopId): stopId is string => Boolean(stopId && existingStopIds.has(stopId)));

  if (replaceMissingStops) {
    await tx.tourStop.deleteMany({
      where: {
        tourId,
        ...(preservedStopIds.length > 0 ? { id: { notIn: preservedStopIds } } : {}),
      },
    });
  }

  for (const stop of scheduledStops) {
    const data = {
      listingId: stop.listingId,
      order: stop.order,
      address: stop.address,
      lat: stop.lat,
      lng: stop.lng,
      thumbnailUrl: stop.thumbnailUrl ?? null,
      startTime: stop.startTime,
      endTime: stop.endTime,
    };

    if (stop.id && existingStopIds.has(stop.id)) {
      await tx.tourStop.update({
        where: { id: stop.id },
        data,
      });
      continue;
    }

    await tx.tourStop.create({
      data: {
        tourId,
        ...data,
      },
    });
  }
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

  const dbTour = await prisma.$transaction(async (tx) => {
    const createdTour = await tourRepo.create({
      tenantId: options.tenantId,
      userId: options.userId,
      title: req.clientName ? `${req.clientName}'s Tour` : 'Planned Tour',
      clientName: req.clientName ?? '',
      date,
      startTime,
      defaultDurationMinutes,
      defaultBufferMinutes,
      stops: scheduledStops,
    }, tx);

    const narrationPayloads = generateTourNarrations(
      toApiTour(createdTour),
      listings ?? new Map(),
    );

    const updatedTour = await tourRepo.update(
      createdTour.id,
      options,
      { narrationPayloads },
      tx,
    );

    if (!updatedTour) {
      throw createHttpError(500, 'Failed to persist tour');
    }

    return updatedTour;
  });

  return toApiTour(dbTour) as PlannedTour;
}

export async function getTourById(id: string, options: TourOptions): Promise<Tour | undefined> {
  const dbTour = await tourRepo.findById(id, options);
  return dbTour ? toApiTour(dbTour) : undefined;
}

export async function updateTour(
  id: string,
  options: TourOptions,
  updates: Partial<Tour>,
): Promise<Tour | undefined> {
  const dbTour = await prisma.$transaction(async (tx) => {
    const existing = await tourRepo.findById(id, options, tx);
    if (!existing) {
      return null;
    }

    const existingTour = toApiTour(existing);
    const needsReschedule = shouldRescheduleTour(updates);

    const updatedTourRow = await tourRepo.update(id, options, {
      title: updates.title,
      clientName: updates.clientName,
      date: updates.date,
      startTime: updates.startTime,
      defaultDurationMinutes: updates.defaultDurationMinutes,
      defaultBufferMinutes: updates.defaultBufferMinutes,
      narrationPayloads: needsReschedule ? undefined : updates.narrationPayloads,
    }, tx);

    if (!updatedTourRow) {
      return null;
    }

    if (needsReschedule) {
      const date = updates.date ?? existing.date;
      const startTime = updates.startTime ?? existing.startTime;
      const duration = updates.defaultDurationMinutes ?? existing.defaultDurationMinutes;
      const buffer = updates.defaultBufferMinutes ?? existing.defaultBufferMinutes;
      const stopInputs = resolveUpdatedStops(updates.stops, existingTour.stops);
      const scheduledStops = scheduleStops(stopInputs, date, startTime, duration, buffer);

      await syncTourStops(
        tx,
        id,
        existingTour.stops,
        scheduledStops,
        updates.stops !== undefined,
      );
    }

    const finalTour = await tourRepo.findById(id, options, tx);
    if (!finalTour) {
      return null;
    }

    if (needsReschedule) {
      const narrationPayloads = generateTourNarrations(
        toApiTour(finalTour),
        new Map(),
      );

      const persistedWithNarrations = await tourRepo.update(
        id,
        options,
        { narrationPayloads },
        tx,
      );

      if (!persistedWithNarrations) {
        return null;
      }

      return persistedWithNarrations;
    }

    return finalTour;
  });

  return dbTour ? toApiTour(dbTour) : undefined;
}

export async function deleteTour(id: string, options: TourOptions): Promise<boolean> {
  return tourRepo.deleteById(id, options);
}

export async function listTours(options: TourOptions): Promise<Tour[]> {
  const dbTours = await tourRepo.findAll(options);
  return dbTours.map(toApiTour);
}
