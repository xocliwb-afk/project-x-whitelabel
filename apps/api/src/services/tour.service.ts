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

export const DEFAULT_TOUR_TIME_ZONE = 'UTC';

export interface TourStopUpdateInput {
  id?: string;
  listingId: string;
  address: string;
  lat: number;
  lng: number;
  thumbnailUrl?: string | null;
  order?: number;
  startTime?: string;
  endTime?: string;
}

export interface TourUpdateRequest {
  title?: string;
  clientName?: string;
  date?: string;
  startTime?: string;
  timeZone?: string;
  defaultDurationMinutes?: number;
  defaultBufferMinutes?: number;
  stops?: TourStopUpdateInput[];
  narrationPayloads?: Tour['narrationPayloads'] | null;
}

type TimeZoneParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function readDateParts(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
}

function readTimeParts(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

function getTimeZoneParts(instant: Date, timeZone: string): TimeZoneParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = formatter.formatToParts(instant);
  const valueByType = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(valueByType.get('year')),
    month: Number(valueByType.get('month')),
    day: Number(valueByType.get('day')),
    hour: Number(valueByType.get('hour')),
    minute: Number(valueByType.get('minute')),
    second: Number(valueByType.get('second')),
  };
}

function getTimeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = getTimeZoneParts(instant, timeZone);
  const zonedTimeAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return zonedTimeAsUtc - instant.getTime();
}

function localDateTimeToUtcDate(date: string, startTime: string, timeZone: string): Date {
  const { year, month, day } = readDateParts(date);
  const { hour, minute } = readTimeParts(startTime);
  const localWallTimeAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);

  let utcTime = localWallTimeAsUtc - getTimeZoneOffsetMs(new Date(localWallTimeAsUtc), timeZone);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const adjustedUtcTime = localWallTimeAsUtc - getTimeZoneOffsetMs(new Date(utcTime), timeZone);
    if (adjustedUtcTime === utcTime) {
      break;
    }
    utcTime = adjustedUtcTime;
  }

  const scheduledDate = new Date(utcTime);
  const scheduledParts = getTimeZoneParts(scheduledDate, timeZone);
  if (
    scheduledParts.year !== year ||
    scheduledParts.month !== month ||
    scheduledParts.day !== day ||
    scheduledParts.hour !== hour ||
    scheduledParts.minute !== minute
  ) {
    throw createHttpError(400, 'date/startTime is not valid in the requested timeZone', 'VALIDATION_ERROR');
  }

  return scheduledDate;
}

function addMinutes(instant: Date, minutes: number): Date {
  return new Date(instant.getTime() + minutes * 60 * 1000);
}

/**
 * Schedule stop times based on duration and buffer.
 * Converts the requested wall-clock time in an explicit IANA timezone to UTC ISO strings.
 */
export function scheduleStops(
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
  timeZone = DEFAULT_TOUR_TIME_ZONE,
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
  const startDate = localDateTimeToUtcDate(date, startTime, timeZone);
  if (Number.isNaN(startDate.getTime())) {
    throw createHttpError(400, 'Invalid startTime provided', 'VALIDATION_ERROR');
  }

  let current = startDate;
  return stops.map((stop, idx) => {
    const startIso = current.toISOString();
    const endDate = addMinutes(current, defaultDurationMinutes);
    const endIso = endDate.toISOString();
    current = addMinutes(endDate, defaultBufferMinutes);

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

function shouldRescheduleTour(updates: TourUpdateRequest): boolean {
  return (
    updates.stops !== undefined ||
    updates.date !== undefined ||
    updates.startTime !== undefined ||
    updates.timeZone !== undefined ||
    updates.defaultDurationMinutes !== undefined ||
    updates.defaultBufferMinutes !== undefined
  );
}

function resolveUpdatedStops(
  incomingStops: TourStopUpdateInput[] | undefined,
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
    const existingStop = stop.id ? existingStopsById.get(stop.id) : undefined;
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
  const {
    date,
    startTime,
    defaultDurationMinutes,
    defaultBufferMinutes,
    timeZone = DEFAULT_TOUR_TIME_ZONE,
  } = req;

  const scheduledStops = scheduleStops(
    req.stops,
    date,
    startTime,
    defaultDurationMinutes,
    defaultBufferMinutes,
    timeZone,
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
      throw createHttpError(500, 'Failed to persist tour', 'TOUR_PERSIST_FAILED');
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
  updates: TourUpdateRequest,
): Promise<Tour | undefined> {
  const dbTour = await prisma.$transaction(async (tx) => {
    const existing = await tourRepo.findById(id, options, tx);
    if (!existing) {
      return null;
    }

    const existingTour = toApiTour(existing);
    const needsReschedule = shouldRescheduleTour(updates);
    const tourFieldUpdates = {
      title: updates.title,
      clientName: updates.clientName,
      date: updates.date,
      startTime: updates.startTime,
      defaultDurationMinutes: updates.defaultDurationMinutes,
      defaultBufferMinutes: updates.defaultBufferMinutes,
      narrationPayloads: needsReschedule ? undefined : updates.narrationPayloads,
    };

    const hasTourFieldUpdates = Object.values(tourFieldUpdates).some((value) => value !== undefined);
    if (hasTourFieldUpdates) {
      const updatedTourRow = await tourRepo.update(id, options, tourFieldUpdates, tx);
      if (!updatedTourRow) {
        return null;
      }
    }

    if (needsReschedule) {
      const date = updates.date ?? existing.date;
      const startTime = updates.startTime ?? existing.startTime;
      const duration = updates.defaultDurationMinutes ?? existing.defaultDurationMinutes;
      const buffer = updates.defaultBufferMinutes ?? existing.defaultBufferMinutes;
      const timeZone = updates.timeZone ?? DEFAULT_TOUR_TIME_ZONE;
      const stopInputs = resolveUpdatedStops(updates.stops, existingTour.stops);
      const scheduledStops = scheduleStops(stopInputs, date, startTime, duration, buffer, timeZone);

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
