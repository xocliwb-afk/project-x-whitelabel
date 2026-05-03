# Project X White Label — Master PR Tracker

**Last Updated:** 2026-05-03

---

## Epic Sequence

### Epic 0: Baseline Audit & Doctrine ✅ COMPLETE
**Branch:** `feature/phase-0-baseline-audit`
**PR:** Merged to dev (initial commit)
**Goal:** Deep audit, planning docs, verification, identify coupling

---

### Epic 1: Foundation Hardening ✅ COMPLETE
**Branch:** `feature/phase-1-foundation-hardening`
**PR:** #1 → merged to dev
**Goal:** Remove brand/business coupling, establish config-driven patterns

**What was done:**
- BrandConfig + ThemeConfig types in shared-types
- config/brand.json as canonical brand config
- All web components read from brand config (Header, Footer, Navbar, Layout)
- talk-to-brandon → talk-to-agent
- GoHighLevel lead provider fully removed
- Neighborhood slugs config-driven in next.config.js

---

### Epic 2: Shared Contracts Hardening ✅ COMPLETE
**Branch:** `feature/phase-2-shared-contracts`
**PR:** #2 → merged to dev
**Goal:** Add missing canonical types, audit contracts

**What was done:**
- TourRoute, TourRouteSegment types added
- NarrationPayload, ProximityEvent types added
- LeadPayload aligned with actual API contract
- NormalizedListing: added county, neighborhood to address
- Shared-types completeness audit + vendor leakage audit docs

---

### Epic 3: Live Data Hardening ✅ COMPLETE
**Branch:** `feature/phase-3-live-data-hardening`
**PR:** #3 → merged to dev
**Goal:** Harden compliance, sync providers

**What was done:**
- applyListingCompliance: real implementation (was a passthrough stub)
- Compensation stripping, attribution enforcement
- Compliance wired into both listing endpoints
- Mock provider synced with NormalizedListing shape
- LeadResponse aligned with shared-types
- SimplyRETS error handling audit

---

### Epic 4: Brand Config System ✅ COMPLETE
**Branch:** `feature/phase-4-brand-config-system`
**PR:** #5 → merged to dev
**Goal:** File-based brand config with web + API consumption

**What was done:**
- GET /api/brand endpoint serving brand.json
- Verified web loading path (lib/brand.ts)
- Feature flags in brand.json
- theme.json fully removed (brand.json is canonical)
- Tailwind pipeline verified

---

### Epic 5: Core Web Product Stabilization ✅ COMPLETE
**Branch:** `feature/phase-5-web-product-stabilization`
**PR:** #6 → merged to dev
**Goal:** Audit and fix all web product surfaces

**What was done:**
- Fixed vendor leakage in listingFormat.ts (hardcoded SimplyRETS → normalized attribution)
- Fixed brand residue in Header.tsx (hardcoded logo → brand.logo.url)
- Audited search, PDP, lead flow, route continuity — all clean
- Zero hardcoded brand names in product TS/TSX code

---

### Epic 6: Mobile Architecture Foundation ✅ COMPLETE
**Branch:** `feature/phase-6-mobile-foundation`
**PR:** #7 → merged to dev
**Goal:** Transform apps/mobile from skeleton to real Flutter app

**What was done:**
- Flutter project setup (dio, riverpod, go_router, json_serializable, freezed)
- Dart model classes mirroring all shared-types contracts
- Dio-based API client with all BFF endpoints
- BrandConfig → ThemeData mapping (colors, typography, radii)
- GoRouter navigation with initial route scaffolding
- Riverpod initialization with brand config fetch on startup

---

### Epic 7: Tour Engine Hardening ✅ COMPLETE
**Branch:** `feature/phase-7-tour-engine-hardening`
**PR:** #8 → merged to dev
**Goal:** Full CRUD tour subsystem with narration payload generation

**What was done:**
- In-memory tour store (Map<string, Tour>) for CRUD
- GET/PUT/DELETE /api/tours/:id endpoints
- Narration payload generation during tour planning
- TourBuilderClient fixed to use correct store
- Duplicate old tour store removed

---

### Epic 8: Narration / Geofence / Android Auto ✅ COMPLETE
**Branch:** `feature/phase-8-narration-android-auto`
**PR:** #9 → merged to dev
**Goal:** Architecture and foundational code for narration/geofence/Android Auto

**What was done:**
- Narration service (API): rich listing-based narration generation
- GET /api/tours/:id/narrations endpoint
- Tour planning wired to narration service
- Flutter: NarrationPayload + ProximityEvent Dart models
- Flutter: NarrationService with TtsEngine interface (NoOp for dev)
- Flutter: ProximityService with geofence interface + simulate methods
- Flutter: AndroidAutoService stub with TourDriveState, AutoEvent
- Android Auto architecture README (platform channel bridge, data flows, native requirements)

---

### Epic 9: HubSpot Hardening ✅ COMPLETE
**Branch:** `feature/phase-9-hubspot-hardening`
**PR:** #10 → merged to dev
**Goal:** Production-quality HubSpot integration

**What was done:**
- HubSpot client rewrite: exponential backoff retry (500ms/1s/2s, max 3 retries)
- HubSpotApiError classification (auth/rate_limit/validation/server/network)
- HubSpot provider: classified error messages, never leaks API details
- Leads route: include provider in responses, prevent error message leakage
- Verified deduplication (create-or-update via email search) already working
- Verified mock provider parity (same LeadResult shape)
- Lead service tests: validation rejections, mock provider submission, response shape

**Dependencies:** Epic 5

---

### Epic 10: Repo Truth Reconciliation ✅ COMPLETE
**Branch:** `feature/phase-10-repo-truth-reconciliation`
**Status:** Complete
**Goal:** Cross-audit reconciliation — fix all drift between docs, code, and contracts

**What was done:**
- Deleted stale index.ts API entrypoint (old mock-only server)
- Aligned Flutter models with shared-types (narrationPayloads on Tour, dynamic IDs, full search params)
- Updated planning docs (narration architecture, tour engine, PR tracker)
- Removed hardcoded "Project X" residue from product code
- Fixed compliance comment to match actual implementation
- Fixed stale contract drift comments in web api-client
- Moved hardcoded marketing nav copy to brand config
- Cleaned up SimplyRETS CDN reference in next.config.js
- Added API test execution to CI workflow
- Improved lead service error classification (proper error types vs string matching)
- Renamed ThemeContext to MapLayoutContext (it controls map layout, not theming)
- Fixed module resolution in computePreviewSide test

**Dependencies:** Epics 0-9

---

### Epic 15: Mobile Search, Listing Detail, and Tour Screens ✅ COMPLETE
**Branches / PRs:**
- `feature/epic-15-mobile-routing-contract` — PR #31
- `feature/epic-15-mobile-data-state-foundation` — PR #32
- `feature/epic-15-mobile-search-screen` — PR #33
- `feature/epic-15-mobile-listing-detail` — PR #34
- `feature/epic-15-mobile-tour-screen` — PR #35
- `feature/epic-15-mobile-hardening-docs` — PR #36

**Goal:** Deliver real Flutter Search, Listing Detail, and Tour screens while preserving the locked Epic 15 scope.

**What was done:**
- Mobile route contract: `/search`, `/listing/:id`, and `/tour` public; persisted user-data actions remain auth-gated
- Mobile data/state foundation: search, listing detail, and tour repositories/controllers/providers; full tour CRUD wrappers
- Search screen: list-first public search UI with loading, empty, error/retry, refresh, pagination/load-more, result cards, navigation, and feature-gated local add-to-tour
- Listing Detail screen: PDP-style detail UI with preview fallback, full detail hydration, retry/error states, media fallback, facts, description, attribution/disclaimer, and feature-gated local add-to-tour
- Tour screen: local draft planner/current-tour UI with stops, remove/reorder, schedule metadata, auth-gated persistence, success/error state, current-tour status, and `tourEngine=false` persistence blocking
- Mobile tests: routing, search, listing detail, tour controller, and tour screen coverage

**Explicitly deferred:**
- Embedded map SDK work
- Route polyline rendering
- Navigation handoff
- Geofencing
- TTS/narration playback
- Android Auto production implementation
- Favorites/saved searches/lead capture on Epic 15 mobile screens
- Share/export
- Multi-tour archive/history UX

**Dependencies:** Epic 14 completion, runtime tenant brand bootstrap, mobile Flutter toolchain validation

---

### Pre-Epic-16 Hardening ✅ CORE COMPLETE; PR #42 DOCS CLEANUP IN REVIEW
**Branches / PRs:**
- `chore/epic-16-tour-contract-hardening` — PR #37
- `chore/ci-generate-prisma-client` — PR #38
- `docs/reconcile-hardening-pr-numbering` — PR #39
- `chore/narration-contract-hardening` — PR #40
- `ci/mobile-validation` — PR #41
- `docs/post-epic-15-truth-cleanup` — PR #42

**Goal:** Harden tour/narration contracts and CI gates before Epic 16 native/location/audio work begins.

**What was done:**
- Tour create/update validation and date/startTime/timeZone behavior hardened and tested
- CI generates Prisma client before `@project-x/database` builds
- Planning numbering reconciled after the CI/database fix consumed GitHub PR #38
- Narration payload validation, malformed persisted payload handling, and listing enrichment dedupe/capping hardened
- Blocking CI now runs `flutter pub get`, `flutter analyze`, and `flutter test` for `apps/mobile`
- Remaining planning docs are being reconciled so completed hardening is not restarted

**Still not started:**
- Epic 16 geofencing
- TTS playback
- Android Auto production implementation
- Embedded maps, route polylines, and navigation handoff

---

## Dependency Graph

```
Epic 0 (Audit) ✅
  └── Epic 1 (Foundation Hardening) ✅
      ├── Epic 2 (Shared Contracts) ✅
      │   ├── Epic 3 (Live Data) ✅
      │   └── Epic 4 (Brand Config) ✅
      │       ├── Epic 5 (Web Stabilization) ✅
      │       │   ├── Epic 7 (Tour Engine) ✅
      │       │   └── Epic 9 (HubSpot) ✅
      │       └── Epic 6 (Mobile Foundation) ✅
      │           └── Epic 8 (Android Auto/Narration) ✅
      └── Epic 7 depends on Epic 5 + 6
Epic 10 (Repo Truth Reconciliation) ✅
  └── depends on all Epics 0-9
Epic 15 (Mobile Search, Listing Detail, and Tour Screens) ✅
  └── Pre-Epic-16 hardening PRs #37-#41 ✅
```

## Anti-Absorption Rules

Each epic must NOT absorb work from other epics. Specifically:

- **Epic 1** must not include Flutter work, tour enhancements, or marketing redesign
- **Epic 2** must not implement narration logic — only define types
- **Epic 3** must not add new listing providers
- **Epic 4** must not build multi-tenant or admin UI
- **Epic 5** must not redesign search UX or add new features
- **Epic 6** must not implement Android Auto — only Flutter foundation
- **Epic 7** must not implement route optimization — only foundation
- **Epic 8** must not build production Android Auto — only architecture + prototype
