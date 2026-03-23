import {
  PlanTourRequest,
  PlannedTour,
  Tour,
  TourStop,
} from '@project-x/shared-types';

const makeId = () => `tour-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function planTour(req: PlanTourRequest): PlannedTour {
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
  };

  return tour as PlannedTour;
}
