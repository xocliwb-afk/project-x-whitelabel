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
