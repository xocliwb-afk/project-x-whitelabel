# Project X White Label — Feature Matrix

**Last Updated:** 2026-03-23

---

## Classification Key

- **NOW**: Non-negotiable for current/next phase
- **DESIGN NOW**: Design the architecture now, implement in a later phase
- **LATER (COMMITTED)**: Committed product pillar, implementation deferred
- **NOT NOW**: Out of scope for foreseeable roadmap

---

## Search Platform

| Feature | Status | Classification | Notes |
|---------|--------|---------------|-------|
| Map + list split view | ✅ Built | NOW | Mapbox-based, lens UI, working |
| Property filters (price, beds, baths, sqft, type, status) | ✅ Built | NOW | Full filter bar, API support |
| Extended filters (year, DOM, keywords, cities, zips, counties) | ✅ Built | NOW | API wired, UI partially wired |
| Property Detail Page (PDP) | ✅ Built | NOW | `/listing/[id]` route, gallery, info |
| AI-assisted search | ✅ Built | NOW | Gemini-powered, parse-search endpoint |
| Search URL state / deep linking | ⚠️ Partial | NOW | Needs audit for completeness |
| Pagination | ✅ Built | NOW | cursor-style (hasMore) |
| Sort options | ✅ Built | NOW | price-asc, price-desc, dom, newest |
| Saved searches | ❌ Missing | NOT NOW | Future enhancement |
| Listing favorites | ❌ Missing | NOT NOW | Future enhancement |

## Live Data / Providers

| Feature | Status | Classification | Notes |
|---------|--------|---------------|-------|
| SimplyRETS listing provider | ✅ Built | NOW | Full normalization, bbox, filters |
| Mock listing provider | ✅ Built | NOW | Dev-safe fallback |
| Listing caching | ✅ Built | NOW | TTL-based, configurable |
| Compliance/attribution | ⚠️ Stub | NOW | BLOCKER: `applyListingCompliance` is a stub passthrough — must be hardened before any live/production deployment. Tracked in Epic 3. |
| Mapbox geocoding | ✅ Built | NOW | Server-side, cached, rate-limited |

## Lead / Contact

| Feature | Status | Classification | Notes |
|---------|--------|---------------|-------|
| Lead capture form | ✅ Built | NOW | Modal-based, intent-driven |
| HubSpot integration | ✅ Built | NOW | Contact create/update via API |
| Captcha verification | ✅ Built | NOW | reCAPTCHA |
| Rate limiting | ✅ Built | NOW | Per-IP RPM + daily limits |
| Lead validation/normalization | ✅ Built | NOW | In LeadService |
| GoHighLevel integration | ❌ Removed | REMOVE in Epic 1 | Dead — removed, not deprecated |

## White-Label / Brand

| Feature | Status | Classification | Notes |
|---------|--------|---------------|-------|
| Theme JSON → Tailwind tokens | ✅ Built | NOW | Works via config/brand.json (theme.json removed in Epic 4) |
| Brand name in config | ✅ Built | NOW | In brand.json, consumed by all components via lib/brand.ts |
| Brand config system | ✅ Built | NOW | BrandConfig type in shared-types, brand.json canonical, /api/brand endpoint |
| Dynamic brand-driven components | ✅ Built | NOW | Layout, Header, Footer, Navbar, LeadModal all config-driven |
| Multi-tenant support | ❌ Missing | NOT NOW | V1 is single-tenant |

## Tour Engine

| Feature | Status | Classification | Notes |
|---------|--------|---------------|-------|
| Tour domain models | ✅ Built | NOW | Tour, TourStop, PlanTourRequest, NarrationPayload in shared-types |
| Tour planning service | ✅ Built | NOW | Time-based scheduling, narration generation, in-memory CRUD |
| Tour API routes | ✅ Built | NOW | GET/POST/PUT/DELETE /api/tours, GET /api/tours/:id/narrations |
| Tour Builder web UI | ✅ Built | NOW | TourBuilderClient + TourPanel share unified Zustand store |
| Add-to-tour from search | ⚠️ Partial | DESIGN NOW | AddToTourIcon exists but unused — needs search card integration |
| Tour route optimization | ❌ Missing | LATER (COMMITTED) | Needs routing/directions API |
| Tour sharing/export | ❌ Missing | LATER (COMMITTED) | Calendar export, share link |

## Mobile (Flutter)

| Feature | Status | Classification | Notes |
|---------|--------|---------------|-------|
| Flutter project scaffold | ✅ Built | NOW | Riverpod, GoRouter, Dio, json_serializable |
| API client | ✅ Built | NOW | Dio-based, all BFF endpoints including narrations |
| Brand config consumption | ✅ Built | NOW | BrandConfig → ThemeData mapping |
| Dart models | ✅ Built | NOW | Mirrors shared-types: Listing, Tour, Brand, Lead, Narration |
| Narration service | ✅ Built | NOW | Fetch narrations, TtsEngine interface |
| Proximity service | ⚠️ Stub | DESIGN NOW | Interface defined, simulate methods for testing |
| Search UI | ❌ Missing | LATER (COMMITTED) | Core mobile feature |
| Map integration | ❌ Missing | LATER (COMMITTED) | Need map SDK decision |
| PDP | ❌ Missing | LATER (COMMITTED) | Detail view |
| Tour Engine UI | ❌ Missing | LATER (COMMITTED) | Mobile tour experience |

## Android Auto / Narration

| Feature | Status | Classification | Notes |
|---------|--------|---------------|-------|
| Narration domain models | ✅ Built | NOW | NarrationPayload, ProximityEvent in shared-types + Dart models |
| Narration service (API) | ✅ Built | NOW | Rich listing-based narration generation, GET /api/tours/:id/narrations |
| Arrival detection | ⚠️ Stub | DESIGN NOW | ProximityService interface defined, simulateArrival for testing |
| TTS integration | ⚠️ Stub | LATER (COMMITTED) | TtsEngine interface defined, NoOpTtsEngine for dev |
| Android Auto surface | ⚠️ Stub | LATER (COMMITTED) | AndroidAutoService interface, architecture documented |
| Flutter/native bridge | ⚠️ Stub | DESIGN NOW | Platform channel architecture documented, not yet implemented |

## Infrastructure

| Feature | Status | Classification | Notes |
|---------|--------|---------------|-------|
| Monorepo (pnpm + Turborepo) | ✅ Built | NOW | Working |
| CI pipeline | ✅ Built | NOW | GitHub Actions |
| E2E tests | ✅ Built | NOW | 8 Playwright specs |
| API unit tests | ✅ Built | NOW | 77 tests, all passing |
| Security headers | ✅ Built | NOW | CORS, CSP, XFO |
| Bundle analysis | ✅ Built | NOW | @next/bundle-analyzer |
| Lighthouse CI | ✅ Built | NOW | Non-blocking workflow |

## Marketing / Static

| Feature | Status | Classification | Notes |
|---------|--------|---------------|-------|
| Static HTML marketing pages | ✅ Built | NOT NOW | Served via Next.js rewrites, brand-specific |
| Neighborhood pages | ✅ Built | NOT NOW | Michigan-specific, needs generalization |
| SEO (robots.txt, sitemap) | ✅ Built | NOT NOW | Needs generalization |
