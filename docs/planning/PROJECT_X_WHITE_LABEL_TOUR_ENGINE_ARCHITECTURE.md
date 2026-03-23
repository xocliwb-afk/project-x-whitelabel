# Project X White Label — Tour Engine Architecture

**Last Updated:** 2026-03-23

---

## 1. Current State (Audit Findings)

The Tour Engine already has meaningful seeds:

### Shared Types (`packages/shared-types/src/tour.ts`)
- `TourStop` — id, listingId, order, address, lat/lng, thumbnailUrl, startTime, endTime
- `Tour` — id, title, clientName, date, startTime, durations, stops[]
- `TourStopInput` — listingId, address, lat/lng (for planning requests)
- `PlanTourRequest` — date, clientName, stops[], timing config
- `PlannedTour` — alias for Tour (response from planning)

### API (`apps/api`)
- `services/tour.service.ts` — `planTour()` function that creates a Tour with sequential time slots
- `routes/tours.route.ts` — `POST /api/tours` (also `/api/v1/tours`) with input validation

### Web (`apps/web`)
- `components/TourBuilderClient.tsx` — Tour builder page component
- `components/tour/TourPanel.tsx` — Tour panel UI
- `components/tour/TourStopCard.tsx` — Individual tour stop card
- `components/icons/AddToTourIcon.tsx` — Icon for add-to-tour action
- `stores/useTourStore.ts` — Zustand store for tour state
- `app/tour/page.tsx` — `/tour` route
- `lib/api-client.ts` — `planTourApi()` function

**Assessment: The Tour Engine has a solid domain model and basic scheduling. It is NOT a toy.**

## 2. Domain Model

```
Tour
├── id: string
├── title: string
├── clientName: string
├── date: string (YYYY-MM-DD)
├── startTime: string (HH:MM)
├── defaultDurationMinutes: number
├── defaultBufferMinutes: number
└── stops: TourStop[]
    ├── id: string
    ├── listingId: string
    ├── order: number
    ├── address: string
    ├── lat: number
    ├── lng: number
    ├── thumbnailUrl?: string
    ├── startTime: string (ISO)
    └── endTime: string (ISO)
```

## 3. Add-to-Tour Flow

### Current Flow
1. User finds listing in search results or PDP
2. User clicks "Add to Tour" icon
3. Listing is added to tour store (Zustand)
4. User navigates to `/tour` to manage stops
5. User submits tour plan → POST /api/tours
6. API returns PlannedTour with scheduled time slots

### Target Flow (Enhanced)
1. Same discovery + add flow
2. **Tour Panel** visible as sidebar or bottom sheet during search (not just on /tour)
3. Drag-to-reorder stops
4. Route optimization suggestion (future: directions API)
5. Submit → get scheduled tour with map route
6. Share/export to calendar
7. Mobile: same flow, native feel

## 4. What's Missing (Not Yet Built)

| Feature | Priority | Notes |
|---------|----------|-------|
| `TourRoute` type | DESIGN NOW | Route/directions between stops |
| Route optimization | LATER | Needs directions API (Mapbox/Google) |
| Tour persistence (DB) | LATER | Currently in-memory only |
| Tour sharing | LATER | Share link, calendar export |
| Tour notifications | LATER | Reminders, upcoming stop alerts |
| Multi-day tours | LATER | Currently single-day only |
| Agent-side tour view | LATER | Agent sees client's tour |

## 5. Proposed New Types (for shared-types)

```typescript
// Route between tour stops
interface TourRoute {
  tourId: string;
  segments: TourRouteSegment[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
}

interface TourRouteSegment {
  fromStopId: string;
  toStopId: string;
  distanceMeters: number;
  durationSeconds: number;
  polyline?: string; // encoded polyline for map display
}
```

## 6. API Responsibilities

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `POST /api/tours` | POST | Plan a tour (schedule stops) | ✅ Built |
| `GET /api/tours/:id` | GET | Get tour by ID | ❌ Not built |
| `PUT /api/tours/:id` | PUT | Update tour | ❌ Not built |
| `DELETE /api/tours/:id` | DELETE | Delete tour | ❌ Not built |
| `POST /api/tours/:id/route` | POST | Calculate route between stops | ❌ Not built |

## 7. Web / Mobile Touchpoints

| Surface | Component | Purpose |
|---------|-----------|---------|
| Web Search | AddToTourIcon on listing cards | Quick add from search |
| Web PDP | Add to Tour button | Add from detail page |
| Web Tour | TourBuilderClient | Manage tour stops, plan |
| Web Tour | TourPanel | Sidebar/overlay with current stops |
| Mobile Search | Add to Tour button | Same concept |
| Mobile Tour | Tour management screen | Native tour experience |
| Android Auto | Tour navigation mode | Drive between stops with narration |
