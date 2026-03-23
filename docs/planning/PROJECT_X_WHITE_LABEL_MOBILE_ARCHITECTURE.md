# Project X White Label — Mobile Architecture

**Last Updated:** 2026-03-23

---

## 1. Current State

`apps/mobile` contains a bare Flutter skeleton:
- `pubspec.yaml` — Flutter project with no dependencies beyond core SDK
- `lib/main.dart` — "Project X Mobile – Skeleton" placeholder

**This is decorative, not functional.** No API client, no state management, no navigation, no brand consumption.

## 2. Flutter's Role

Flutter is the **primary mobile client**. It is NOT optional. The mobile app must:

1. Consume the same BFF API as the web client (`apps/api`)
2. Consume brand config for theming and identity
3. Share domain models/contracts with web via API responses (not direct TypeScript import)
4. Provide search, map, PDP, lead capture, and tour experiences
5. Host Android Auto integration via native platform channels

## 3. Shared Contracts

Flutter cannot directly import TypeScript types. The contract is enforced through:

1. **API response shapes** — The BFF returns `NormalizedListing`, `PlannedTour`, etc.
2. **Dart model classes** — Generated or manually maintained to match shared-types
3. **API contract tests** — Ensure Dart models stay in sync with TypeScript types

### Key Dart Models Needed

| Dart Class | Mirrors TypeScript Type | Purpose |
|-----------|------------------------|---------|
| `Listing` | `NormalizedListing` | Property data |
| `ListingSearchParams` | `ListingSearchParams` | Search query |
| `PaginatedResponse<T>` | `PaginatedListingsResponse` | Search results |
| `Tour` | `Tour` | Tour data |
| `TourStop` | `TourStop` | Tour stop |
| `PlanTourRequest` | `PlanTourRequest` | Tour planning |
| `BrandConfig` | `BrandConfig` (new) | Brand identity + theme |
| `LeadPayload` | `LeadPayload` | Lead submission |
| `NarrationPayload` | `NarrationPayload` (new) | Narration data |
| `ProximityEvent` | `ProximityEvent` (new) | Geofence events |

## 4. API Expectations

The mobile app talks exclusively to the BFF API. Expected endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/listings` | GET | Search listings |
| `/api/listings/:id` | GET | Get listing detail |
| `/api/leads` | POST | Submit lead |
| `/api/tours` | POST | Plan tour |
| `/api/geo/geocode` | POST | Geocode location |
| `/api/brand` | GET | Get brand config (new) |
| `/health` | GET | Health check |

## 5. State Management

Recommended approach for Flutter:

- **Riverpod** or **Bloc** for state management (decision deferred to implementation)
- State should mirror the web's Zustand store concepts:
  - Search state (filters, results, pagination)
  - Tour state (stops, planned tour)
  - Lead modal state
  - Brand/theme state
  - Map state (center, zoom, selected listing)

## 6. Native Bridge / Plugin Boundaries

| Capability | Implementation | Bridge Type |
|-----------|---------------|-------------|
| Map rendering | Flutter map package (e.g., flutter_map, google_maps_flutter) | Pure Flutter |
| Location services | Platform channels + geolocator | Flutter plugin |
| Geofencing | Platform channels + native geofence APIs | Custom native plugin |
| Android Auto | Pure native Android (Kotlin) | Platform channel bridge |
| TTS (narration) | Flutter TTS plugin | Flutter plugin |
| Push notifications | Firebase or platform channels | Flutter plugin |
| Deep linking | Flutter deep link handling | Flutter built-in |

## 7. Implementation Phases

### Phase 6A — Project Setup
- Flutter project with proper dependencies
- Navigation (GoRouter or Navigator 2.0)
- API client (Dio or http)
- Brand config loading and ThemeData application
- Dart model classes for core types

### Phase 6B — Core Screens
- Search screen (list view initially, map later)
- Listing detail screen
- Lead/contact form

### Phase 6C — Map + Tour
- Map integration
- Tour management screens
- Add-to-tour flow

### Phase 6D — Android Auto + Narration
- See Android Auto / Narration architecture doc
