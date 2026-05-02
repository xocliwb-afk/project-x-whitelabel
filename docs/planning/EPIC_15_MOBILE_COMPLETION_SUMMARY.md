# Epic 15 Mobile Completion Summary

**Date:** 2026-05-02

## Scope Completed

Epic 15 delivered real Flutter mobile screens for:

- Search
- Listing Detail
- Tour planner/current-tour

The implementation was split into reviewable slices:

| PR | Scope | Result |
|----|-------|--------|
| #31 | Mobile routing contract | `/search`, `/listing/:id`, and `/tour` are public; protected redirects preserved |
| #32 | Mobile data/state foundation | Search, Listing Detail, and Tour repositories/controllers/providers plus tour CRUD wrappers |
| #33 | Search screen vertical slice | List-first public Search UI with state handling, navigation, and feature-gated local add-to-tour |
| #34 | Listing Detail vertical slice | PDP-style detail UI with preview fallback, full-detail hydration, retry/error states, and feature-gated local add-to-tour |
| #35 | Tour screen vertical slice | Local draft planner/current-tour UI with stop management, schedule metadata, auth-gated persistence, and `tourEngine=false` handling |
| #36 | Hardening + docs | Route contract test coverage and documentation reconciliation |

## Current Mobile Route Contract

| Route | Access | Notes |
|-------|--------|-------|
| `/login` | Public | Authenticated users redirect to `/search` |
| `/register` | Public | Authenticated users redirect to `/search` |
| `/search` | Public | List-first mobile search |
| `/listing/:id` | Public | Detail fetch by ID; optional `Listing` preview through `GoRouter.extra` |
| `/tour` | Public local draft | Signed-out draft management allowed; persisted actions auth-gated |

## Current Test Coverage

Mobile tests cover:

- Public route contract for signed-out Search, Listing Detail, and Tour
- Search shell/loading, empty, error/retry, navigation, and add-to-tour behavior
- Listing Detail preview fallback, full-detail render, failed fetch with preview, failed fetch without preview, and add-to-tour gating
- Tour draft controller local draft, reorder/remove, auth-gated persistence, failed persistence, and current tour state
- Tour screen empty draft, stops, remove/reorder, signed-out save auth gate, signed-in save success, failed save draft preservation, and `tourEngine=false`

## Validation Gate

Epic 15 closeout validation should run:

```bash
cd apps/mobile
flutter pub get
flutter analyze
flutter test

cd ../..
pnpm --filter @project-x/api test
pnpm --filter web build
pnpm --filter web lint
```

## Manual QA Status

Manual route/device QA was not fully performed in this PR because the task is repo-local and no mobile device, emulator, or production-like API session was started. The implemented behavior is covered by Flutter widget/controller/route tests and repo validation commands.

Recommended manual QA before release:

- Launch the mobile app with valid `TENANT_ID`, `API_BASE_URL`, Supabase URL, and Supabase anon key.
- Verify signed-out `/search`, `/listing/:id`, and `/tour` access.
- Verify Search initial load, search submit, error/empty states, refresh, and load-more.
- Verify Search-to-Listing preview handoff.
- Verify Listing Detail full fetch, retry states, and preview preservation.
- Verify add-to-tour from Search and Listing Detail when `tourEngine=true`.
- Verify Tour local draft add/remove/reorder and schedule metadata.
- Verify signed-out save shows auth requirement and preserves draft.
- Verify signed-in tour save against the real API.

## Deferred Beyond Epic 15

The following were intentionally out of scope:

- Embedded map SDK work and web map/list parity
- Route polyline rendering
- Navigation handoff/deep links to external maps
- Geofencing
- TTS/narration playback
- Android Auto production implementation
- Favorites/saved searches/lead capture on the Epic 15 mobile screens
- Share/export
- Multi-tour archive/history UX
- Broader mobile platform packaging and physical-device release hardening
