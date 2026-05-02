import type { Tour as DbTour, TourStop as DbTourStop } from '@project-x/database';
import type { Tour, TourStop } from '@project-x/shared-types';
import { readPersistedNarrationPayloads } from './narration-payload.contract';

type DbTourWithStops = DbTour & { stops: DbTourStop[] };

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
    narrationPayloads: readPersistedNarrationPayloads(dbTour.narrationPayloads),
  };
}
