export interface TourStop {
  id: string;
  listingId: string;
  order: number;

  address: string;
  lat: number;
  lng: number;
  thumbnailUrl?: string | null;

  startTime?: string;
  endTime?: string;
}

export interface Tour {
  id: string;
  title: string;
  clientName: string;
  date: string;
  startTime: string;
  defaultDurationMinutes: number;
  defaultBufferMinutes: number;
  stops: TourStop[];
  /** Narration payloads for each stop, generated during tour planning */
  narrationPayloads?: import('./narration').NarrationPayload[];
}

export interface TourStopInput {
  listingId: string;
  address: string;
  lat: number;
  lng: number;
}

export interface PlanTourRequest {
  date: string;
  clientName?: string;
  stops: TourStopInput[];
  startTime: string;
  defaultDurationMinutes: number;
  defaultBufferMinutes: number;
  timeZone?: string;
}

export type PlannedTour = Tour;

/**
 * A single leg of a tour route — the travel segment between two stops.
 */
export interface TourRouteSegment {
  /** ID of the origin stop */
  fromStopId: string;
  /** ID of the destination stop */
  toStopId: string;
  /** Distance in meters */
  distanceMeters: number;
  /** Duration in seconds */
  durationSeconds: number;
  /** Encoded polyline for map rendering (e.g. Google/Mapbox format) */
  polyline?: string;
}

/**
 * A complete route for a tour — connects all stops with travel segments.
 */
export interface TourRoute {
  /** The tour this route belongs to */
  tourId: string;
  /** Ordered segments connecting consecutive stops */
  segments: TourRouteSegment[];
  /** Total travel distance in meters (sum of segments) */
  totalDistanceMeters: number;
  /** Total travel duration in seconds (sum of segments, excludes stop time) */
  totalDurationSeconds: number;
}
