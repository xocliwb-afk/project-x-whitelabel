import type { Tour as DbTour, TourStop as DbTourStop } from '@project-x/database';
import type { Tour, TourStop, NarrationPayload } from '@project-x/shared-types';

type DbTourWithStops = DbTour & { stops: DbTourStop[] };

function isNarrationPayload(value: unknown): value is NarrationPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const payload = value as Record<string, unknown>;
  if (
    typeof payload.tourStopId !== 'string' ||
    typeof payload.listingId !== 'string' ||
    typeof payload.trigger !== 'string' ||
    typeof payload.narrationText !== 'string'
  ) {
    return false;
  }

  if (payload.listingSummary !== undefined) {
    if (
      !payload.listingSummary ||
      typeof payload.listingSummary !== 'object' ||
      Array.isArray(payload.listingSummary)
    ) {
      return false;
    }

    const listingSummary = payload.listingSummary as Record<string, unknown>;
    if (
      typeof listingSummary.address !== 'string' ||
      typeof listingSummary.price !== 'string' ||
      (listingSummary.beds !== null && typeof listingSummary.beds !== 'number') ||
      (listingSummary.baths !== null && typeof listingSummary.baths !== 'number') ||
      (listingSummary.sqft !== null && typeof listingSummary.sqft !== 'number')
    ) {
      return false;
    }

    if (
      listingSummary.highlights !== undefined &&
      (!Array.isArray(listingSummary.highlights) ||
        listingSummary.highlights.some((highlight) => typeof highlight !== 'string'))
    ) {
      return false;
    }
  }

  if (payload.navigationContext !== undefined) {
    if (
      !payload.navigationContext ||
      typeof payload.navigationContext !== 'object' ||
      Array.isArray(payload.navigationContext)
    ) {
      return false;
    }

    const navigationContext = payload.navigationContext as Record<string, unknown>;
    if (
      typeof navigationContext.distanceMeters !== 'number' ||
      typeof navigationContext.durationSeconds !== 'number' ||
      (navigationContext.relation !== 'next' && navigationContext.relation !== 'current')
    ) {
      return false;
    }
  }

  return true;
}

function readNarrationPayloads(value: unknown): NarrationPayload[] | undefined {
  if (value == null) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    return undefined;
  }

  const payloads = value.filter(isNarrationPayload);
  return payloads.length === value.length ? payloads : undefined;
}

/**
 * Convert a Prisma TourStop row to the shared-types TourStop shape.
 */
function toApiStop(dbStop: DbTourStop): TourStop {
  return {
    id: dbStop.id,
    listingId: dbStop.listingId,
    order: dbStop.order,
    address: dbStop.address,
    lat: dbStop.lat,
    lng: dbStop.lng,
    thumbnailUrl: dbStop.thumbnailUrl ?? null,
    startTime: dbStop.startTime ?? undefined,
    endTime: dbStop.endTime ?? undefined,
  };
}

/**
 * Convert a Prisma Tour + TourStop[] to the shared-types Tour shape.
 * This preserves the exact JSON contract returned by the API.
 */
export function toApiTour(dbTour: DbTourWithStops): Tour {
  return {
    id: dbTour.id,
    title: dbTour.title,
    clientName: dbTour.clientName,
    date: dbTour.date,
    startTime: dbTour.startTime,
    defaultDurationMinutes: dbTour.defaultDurationMinutes,
    defaultBufferMinutes: dbTour.defaultBufferMinutes,
    stops: dbTour.stops.map(toApiStop),
    narrationPayloads: readNarrationPayloads(dbTour.narrationPayloads),
  };
}
