# Shared Types Completeness Audit

**Last Updated:** 2026-03-23
**Epic:** 2 — Shared Contracts Hardening

---

## NormalizedListing

| Field | In Type | In API Adapter | Used by Web | Status |
|-------|---------|---------------|-------------|--------|
| `address.county` | Added in Epic 2 | Not mapped from SimplyRETS | Yes (ListingCard.tsx, cast to `any`) | **Fixed in type; adapter mapping deferred to Epic 3** |
| `address.neighborhood` | Added in Epic 2 | Not mapped from SimplyRETS | Yes (ListingCard.tsx, cast to `any`) | **Fixed in type; adapter mapping deferred to Epic 3** |
| All other fields | Yes | Yes | Yes | Match |

**Note:** The SimplyRETS adapter (`apps/api/src/providers/simplyrets.provider.ts`) does not map `county` or `neighborhood` from raw data. The raw SimplyRETS response may or may not include these. Mapping should be added in Epic 3 (Live Data Hardening) when the adapter is audited for completeness.

---

## ListingSearchParams

| Finding | Status |
|---------|--------|
| All API query params covered by type | OK |
| API accepts alias params (minBeds/beds, city/cities, zip/postalCodes) | OK — aliases resolved server-side |
| `clientLimit` field is internal-only | OK — documented with JSDoc comment |

No changes needed.

---

## LeadPayload

| Field | Old Type | Actual API Contract | Fix |
|-------|----------|-------------------|-----|
| `listingId` | `string` (required) | `string?` (optional) | **Fixed: now optional** |
| `context` | Missing | `string?` (optional, JSON, max 8192) | **Fixed: added** |
| `email` | `string` (required) | `string?` (optional, email OR phone required) | **Fixed: now optional** |
| `source` | `'project-x-web' \| 'project-x-app'` (required) | `string?` (optional, defaults to 'project-x-web') | **Fixed: now optional string** |
| `captchaToken` | Missing | `string?` (optional, verified server-side) | **Fixed: added** |

**Note:** The API has its own `LeadRequest` type in `apps/api/src/types/lead.ts` which is more permissive than the shared-types contract. Validation happens in `LeadService.validate()` which requires `name` and `brokerId` as non-empty, and either `email` or `phone`. The shared-types `LeadPayload` now matches the actual wire format.

---

## Tour / PlannedTour

| Finding | Status |
|---------|--------|
| API response shape matches Tour type exactly | OK |
| `PlannedTour` is alias for `Tour` | OK |
| TourStop, TourStopInput, PlanTourRequest all complete | OK |

No changes needed.

---

## API Response Shapes

| Endpoint | Response Shape | Shared Type | Status |
|----------|--------------|-------------|--------|
| `GET /api/listings` | `{ results: NormalizedListing[], pagination: { page, limit, pageCount, hasMore } }` | Not in shared-types (defined in web's `api-client.ts`) | **Note for future: consider adding `PaginatedListingsResponse` to shared-types** |
| `GET /api/listings/:id` | `{ listing: NormalizedListing }` | Not in shared-types | OK — simple wrapper |
| `POST /api/tours` | `PlannedTour` | Yes | OK |
| `POST /api/leads` | `{ success, provider, message? }` | `LeadResponse` (partial match) | **Note: `LeadResponse` only has `success: boolean`, missing `provider` and `message`** |

---

## Gaps Deferred to Later Epics

1. **SimplyRETS adapter — map county/neighborhood** (Epic 3): Raw SimplyRETS data may include county; adapter should map it to `address.county`.
2. **LeadResponse completeness** (Epic 3 or 5): Add `provider` and `message` fields to match actual API response.
3. **PaginatedListingsResponse in shared-types** (Epic 5): Move the paginated response shape to shared-types for cross-surface use.
4. **Source field validation** (Epic 5): API should validate `source` against known values rather than accepting any string.
