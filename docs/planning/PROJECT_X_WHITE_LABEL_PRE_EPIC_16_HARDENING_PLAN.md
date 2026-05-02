# Project X White Label — Pre-Epic 16 Hardening Plan

**Status:** Updated after GitHub PR #37 and PR #38 merges; Epic 16 not started  
**Prepared:** 2026-05-02  
**Context:** Epic 15 is complete on `main`; do not start Epic 16 until the P0 hardening items are complete.  
**Latest hardening commits on `main`:** `69a0729 chore(epic-16): harden tour contract and timezone handling (#37)`, `f2c3ab8 chore(ci): generate Prisma client before database build (#38)`

---

## 1. Executive Summary

Project X White Label has reached a major milestone: Epic 15 converted the Flutter mobile app from placeholder surfaces into real product screens for Search, Listing Detail, and Tour planner/current-tour. The repo now has real API, web, mobile, database, auth, tenant, brand, admin, search, listing, saved-search/favorite, and tour foundations.

The post-Epic 15 health reviews agree on the core conclusion:

- The repo is serious engineered work, not sloppy “vibe-coded” output.
- Epic 15 is complete and validated locally.
- `main` is clean and synced.
- There is no current merge-blocking defect on `main`.
- The next phase should **not** jump directly into Epic 16 geofencing/TTS/native work.
- A short hardening sprint should happen first.

The reason is simple: Epic 16 will depend on tour timing, tour stops, narration payloads, authenticated tour state, and eventually location-aware behavior. Those foundations must be stricter before geofencing, TTS playback, or Android Auto work begins.

This document locks the hardened plan.

---

## 2. Current Repo Truth After Epic 15

### Completed on `main`

Epic 15 is complete.

Delivered:

- Public mobile `/search`
- Public mobile `/listing/:id`
- Public local `/tour`
- Mobile data/state foundation
- Real mobile Search screen
- Real mobile Listing Detail screen
- Real mobile Tour planner/current-tour screen
- Mobile route/widget/controller tests
- Epic 15 documentation reconciliation

### Validated locally by Codex review

The post-Epic 15 Codex health review reported:

- `pnpm --filter @project-x/api typecheck` passed
- `pnpm --filter @project-x/api build` passed
- `pnpm --filter @project-x/api test` passed
- API tests: 17 test files / 163 tests
- `pnpm --filter web build` passed
- `pnpm --filter web lint` passed
- `flutter analyze` passed
- `flutter test` passed
- Mobile tests: 30 tests
- Repo stayed clean after validation

### Current product state

The product now has:

- Working web product surface
- Express BFF/API
- Prisma-backed persistence
- Supabase auth
- Runtime tenant branding
- Admin brand editor
- Saved searches and favorites
- Tour API/data foundation
- Flutter mobile app with real Search, Listing Detail, and Tour screens
- Mobile tests
- Strong planning and implementation guardrails

---

## 3. Strategic Decision

## Do not start Epic 16 yet.

Epic 16 should not start until the P0 pre-Epic-16 hardening work is complete.

Epic 16 is expected to move toward:

- geofencing
- TTS/narration playback
- location-aware tour behavior
- eventual Android Auto handoff

Those capabilities depend on a reliable tour/narration contract. Starting native/location/audio work before hardening tour timing, timezone, validation, and narration payloads would create avoidable rework and fragile behavior.

---

## 4. Explicit Scope Boundaries

### This hardening phase is allowed to touch

- Tour API validation
- Tour date/time/timezone behavior
- Tour request/response contracts, if backward compatible
- Narration payload validation
- Narration enrichment safety
- API tests
- Mobile CI validation
- Documentation truth cleanup
- Small API security/rate-limit cleanup after core tour hardening
- Small maintainability cleanup after blockers are done

### This hardening phase must not absorb

- Geofencing implementation
- TTS playback implementation
- Android Auto implementation
- Embedded mobile maps
- Route polyline rendering
- Navigation handoff / external maps
- Share/export
- Multi-tour archive/history UX
- New saved-search/favorite/lead-capture UI on Epic 15 screens
- Broad mobile UI redesign
- Broad web redesign
- Static marketing tenant modernization, unless explicitly scheduled later

---

## 5. P0/P1 Findings From Post-Epic 15 Review

### P0 / must address before Epic 16

1. **Tour date/time/timezone semantics are weak**
   - `PlanTourRequest.timeZone` exists and mobile sends it.
   - API scheduling currently depends on naive date construction.
   - Epic 16 geofence/TTS behavior needs reliable local tour timing.

2. **Tour create/update validation is too shallow**
   - Need strict validation for date, time, timezone, stops, coordinates, duration, buffer, and update payloads.

3. **Narration payload validation is weak**
   - TTS/geofence layers need predictable narration payloads.
   - Invalid JSON should not silently pass through.

4. **Narration enrichment has N+1 behavior**
   - Per-stop listing fetches are acceptable for tiny tours but should be deduped/capped or explicitly bounded before narration/TTS work.

5. **Mobile validation is not blocking CI**
   - Mobile is now a real product surface.
   - Flutter analyze/test should be part of blocking CI.

6. **Remaining docs drift exists**
   - Docs are greatly improved, but some feature matrix/tracker/current-state references still need cleanup.

### Important but not blockers before Epic 16

These should be planned, but must not delay the core tour/narration hardening:

- splitting big Flutter screen files
- decomposing large web Search files
- removing unused web database dependency
- cleaning CORS preflight config
- rate limiting public listing/search routes
- cleaning static marketing/vendor strings
- revisiting custom tour IDs
- full mobile device/emulator QA
- Android SDK setup
- static marketing multi-tenant modernization

---

## 6. Hardening Roadmap Overview

### Phase 1 — Epic 16 Readiness Blockers

These must happen before Epic 16 starts:

1. GitHub PR #37 — Tour contract/timezone hardening — merged
2. GitHub PR #38 — CI/database Prisma client generation fix — merged
3. Next hardening PR — Narration contract/enrichment hardening — not started
4. Planning label PR 39 — Mobile validation in blocking CI
5. Planning label PR 40 — Remaining repo-truth docs cleanup

**Numbering note:** GitHub PR #38 was consumed by the CI/database Prisma client generation fix. Remaining planned PR labels in this document are planning labels, not guaranteed future GitHub PR numbers.

### Phase 2 — Pre-demo / production hardening

Important before serious demos, pilots, or production:

5. PR 41 — Public listing/search rate limiting
6. PR 42 — CORS preflight cleanup
7. PR 48 — Full mobile device/emulator QA
8. PR 49 — Android SDK setup

### Phase 3 — Maintainability / diligence polish

Useful before major external diligence or heavy future modifications:

9. PR 43 — Split large Flutter screens
10. PR 44 — Decompose large web Search files
11. PR 45 — Remove unused web database dependency
12. PR 46 — Static marketing/vendor string cleanup
13. PR 47 — Tour ID strategy review
14. PR 50 — Static marketing multi-tenant modernization

---

# Phase 1 — Must Complete Before Epic 16

## PR 37 — Tour Contract / Timezone Hardening

**GitHub PR:** #37  
**Status:** Merged on 2026-05-02  
**Branch:** `chore/epic-16-tour-contract-hardening`  
**Priority:** P0  
**Size:** Medium  
**Type:** API contract hardening + tests  
**Status note:** Completed; retained for historical context.

### Goal

Harden the existing tour API contract before Epic 16 begins, especially date/startTime/timeZone semantics and request validation.

### Why it matters

Epic 16 will likely use tour stops, timing, proximity triggers, and narration timing. If tour timing is ambiguous, geofencing and TTS will be unreliable.

### Scope

Harden:

- `POST /api/tours`
- `PUT /api/tours/:id`
- tour date handling
- `startTime`
- `timeZone`
- stop shape
- latitude/longitude bounds
- duration/buffer bounds
- stop count bounds
- update payload validation

### Validation rules to add

- `date` must be `YYYY-MM-DD`
- `startTime` must be `HH:mm` 24-hour time
- `timeZone` must be a valid IANA timezone if supplied
- omitted timezone behavior must be explicit and documented
- `stops` must be a non-empty bounded array
- `listingId` must be non-empty
- `address` must be non-empty
- `lat` must be between `-90` and `90`
- `lng` must be between `-180` and `180`
- `defaultDurationMinutes` must be within sane positive bounds
- `defaultBufferMinutes` must be within sane non-negative bounds

### Likely files

- `apps/api/src/routes/tours.route.ts`
- `apps/api/src/services/tour.service.ts`
- `apps/api/src/services/tour.mapper.ts`
- `apps/api/src/repositories/tour.repository.ts`
- `packages/shared-types/src/tour.ts` only if necessary
- `apps/api/src/routes/__tests__/tours.route.test.ts` or new focused tests

### Must not touch

- mobile UI
- web UI
- geofencing
- TTS
- Android Auto
- docs cleanup
- CI cleanup
- rate limiting
- database schema unless a true blocker is discovered

### Validation gate

```bash
pnpm --filter @project-x/api typecheck
pnpm --filter @project-x/api build
pnpm --filter @project-x/api test
cd apps/mobile && flutter analyze && flutter test
pnpm --filter web build
pnpm --filter web lint
```

### Acceptance criteria

- invalid create/update tour payloads are rejected with stable machine-readable errors
- valid create/update payloads still work
- timezone/date/startTime behavior is explicit and tested
- response shapes remain backward compatible unless a true bug requires a documented change
- all validation gates pass

---

## Next Hardening PR — Narration Contract / Enrichment Hardening

**Branch:** `chore/narration-contract-hardening`  
**Status:** Not started  
**Priority:** P0/P1  
**Size:** Medium  
**Type:** API/service validation hardening + tests

### Goal

Make narration payloads safe and predictable before TTS/geofence work begins.

### Why it matters

Epic 16 may trigger narration playback from proximity events. Malformed narration payloads or inefficient enrichment will create runtime failure, audio bugs, or API load spikes.

### Scope

- validate persisted/read narration payloads
- tighten `tour.mapper.ts`
- reject or safely handle malformed narration JSON
- dedupe repeated listing IDs during narration enrichment
- define maximum stop/enrichment behavior
- add API/service tests

### Likely files

- `apps/api/src/services/tour.mapper.ts`
- `apps/api/src/services/narration.service.ts`
- `apps/api/src/routes/tours.route.ts`
- API tests

### Must not touch

- TTS playback
- geofencing
- Android Auto
- mobile native work
- mobile UI

### Acceptance criteria

- malformed narration payloads cannot silently corrupt runtime behavior
- narration enrichment is deduped or explicitly bounded
- tests cover malformed payloads and enrichment behavior
- API validation remains green

---

## Planning Label PR 39 — Mobile Validation In Blocking CI

**Branch:** `ci/mobile-validation`  
**Priority:** P0  
**Size:** Small/Medium  
**Type:** CI hardening

### Goal

Make Flutter analyze/test part of the blocking CI gate.

### Why it matters

Mobile is now a real product surface. Future native/location/TTS work will be risky if mobile tests are only local/manual.

### Scope

Update CI to run:

```bash
cd apps/mobile
flutter analyze
flutter test
```

### Likely files

- `.github/workflows/ci.yml`

### Requirements

- no Android SDK requirement
- no emulator requirement
- no platform builds
- no generated files
- no app code changes
- use a stable Flutter setup action or equivalent

### Acceptance criteria

- CI runs Flutter analyze/test
- CI remains green
- no app code changed

---

## Planning Label PR 40 — Remaining Repo-Truth Docs Cleanup

**Branch:** `docs/post-epic-15-truth-cleanup`  
**Priority:** P1  
**Size:** Small/Medium  
**Type:** docs only

### Goal

Remove remaining stale repo-truth drift after Epic 15.

### Scope

Clean:

- feature matrix stale status
- PR tracker “PR #36 planned” language after merge
- old API/mobile test counts
- old claims that mobile is skeleton/placeholder
- old claims that tours are purely in-memory if the live repo says otherwise
- docs implying maps/geofencing/TTS/Android Auto are part of Epic 15

### Likely files

- `docs/planning/PROJECT_X_WHITE_LABEL_FEATURE_MATRIX.md`
- `docs/planning/PROJECT_X_WHITE_LABEL_MASTER_PR_TRACKER.md`
- `docs/ARCHITECTURE.md`
- other stale docs found with `rg`

### Acceptance criteria

- docs reflect Epic 15 complete
- docs accurately separate Epic 15 from Epic 16/17
- no code changes
- validation gate still green if requested

---

# Phase 2 — Pre-Demo / Production Hardening

## PR 41 — Public Listing/Search Rate Limiting

**Branch:** `chore/api-public-rate-limits`  
**Priority:** P1/P2  
**Size:** Medium

### Goal

Protect public listing/search routes from scraping and vendor quota drain.

### Scope

- add or extend public route limiting for listing/search
- keep provider caches intact
- avoid Redis unless truly needed now
- document in-memory limiter limitations if used

### Likely files

- `apps/api/src/routes/listings.route.ts`
- `apps/api/src/services/rateLimiter.service.ts`
- route tests

### Acceptance criteria

- public listings/search protected by reasonable limits
- tests cover limiter behavior
- no user-facing regressions

---

## PR 42 — CORS Preflight Cleanup

**Branch:** `chore/api-cors-preflight-cleanup`  
**Priority:** P2  
**Size:** Small

### Goal

Ensure CORS preflight uses the same configured CORS options as normal requests.

### Scope

- clean `app.options("*", cors())` behavior if needed
- ensure production/local behavior is consistent
- add a small test if feasible

### Acceptance criteria

- configured CORS policy applies consistently to preflight and normal requests
- API tests pass

---

## PR 48 — Full Mobile Device / Emulator QA

**Branch:** optional QA/report branch  
**Priority:** P1 before release/demo  
**Size:** Manual QA

### Goal

Prove mobile behavior outside widget tests.

### Scope

Manual QA against real local or staged config:

- Flutter Chrome smoke
- Linux desktop only if platform scaffolding is intentionally added
- Android emulator once SDK is installed
- valid `TENANT_ID`
- valid `API_BASE_URL`
- Supabase config
- signed-out `/search`
- signed-out `/listing/:id`
- signed-out `/tour`
- Search → Detail → Add to Tour → Tour local draft
- signed-in tour save
- logout/reset behavior

### Acceptance criteria

- QA results documented honestly
- blockers separated from local setup issues
- no code changes unless separately approved

---

## PR 49 — Android SDK Setup

**Branch:** optional tooling/docs branch  
**Priority:** P2 before native work  
**Size:** Local/tooling

### Goal

Prepare for Android emulator/native validation before Android Auto work.

### Scope

- install Android Studio / SDK
- accept licenses
- verify `flutter doctor`
- verify emulator/device path
- document setup

### Must not do

- no Android Auto work
- no platform code unless explicitly approved
- no generated platform folders unless intentionally planned

---

# Phase 3 — Maintainability / Diligence Polish

## PR 43 — Split Large Flutter Screen Files

**Branch:** `refactor/mobile-screen-widgets`  
**Priority:** P2  
**Size:** Medium/Large

### Goal

Improve maintainability of large mobile screen files.

### Candidate files

- `apps/mobile/lib/features/tour/presentation/screens/tour_screen.dart`
- `apps/mobile/lib/features/listing_detail/presentation/screens/listing_detail_screen.dart`
- `apps/mobile/lib/features/search/presentation/screens/search_screen.dart`

### Recommended approach

Split into one PR per screen:

1. `refactor/mobile-tour-screen-widgets`
2. `refactor/mobile-listing-detail-widgets`
3. `refactor/mobile-search-screen-widgets`

### Rule

No behavior changes. Preserve tests.

---

## PR 44 — Decompose Large Web Search Files

**Branch:** `refactor/web-search-surface`  
**Priority:** P2/P3  
**Size:** Large

### Goal

Reduce risk in large web Search components before future web search work.

### Candidate files

- `apps/web/app/search/SearchLayoutClient.tsx`
- `apps/web/components/SearchFiltersBar.tsx`

### Rule

No behavior changes. Preserve search E2E behavior.

---

## PR 45 — Remove Unused Web Database Dependency

**Branch:** `chore/web-remove-unused-database-dependency`  
**Priority:** P3  
**Size:** Small

### Goal

Remove unnecessary dependency if live repo confirms web does not import `@project-x/database`.

### Scope

- verify no import exists
- remove package dependency if safe
- run web build/lint

---

## PR 46 — Static Marketing / Vendor String Cleanup

**Branch:** `chore/marketing-vendor-string-cleanup`  
**Priority:** P2/P3  
**Size:** Small/Medium

### Goal

Clean remaining user-facing or diligence-visible vendor strings.

### Scope

- remove hardcoded user-facing SimplyRETS copy where practical
- keep operational CDN allowlist if still required
- document remaining operational vendor entries

---

## PR 47 — Tour ID Strategy Review

**Branch:** `chore/tour-id-strategy-review`  
**Priority:** P3 unless public/shareable tour URLs begin  
**Size:** Small/Medium

### Goal

Decide whether custom tour text IDs are acceptable long-term.

### Scope

- review ID strategy
- document keep/change decision
- avoid migration unless clearly necessary

---

## PR 50 — Static Marketing Multi-Tenant Modernization

**Branch:** `refactor/marketing-tenant-modernization`  
**Priority:** P3 / later  
**Size:** Large

### Goal

Modernize static marketing tenant behavior if product strategy requires it.

### Rule

Do not mix this with API/mobile/tour work. This is a separate project.

---

# 7. Pre-Epic-16 Acceptance Checklist

Epic 16 can start only after:

- [x] GitHub PR #37 merged: tour create/update validation strict and tested
- [x] GitHub PR #37 merged: tour timezone/date/startTime behavior explicit and tested
- [x] GitHub PR #38 merged: CI/database generates Prisma client before database build
- [ ] Next hardening PR merged: narration payload validation strict enough for TTS work
- [ ] Next hardening PR merged: narration enrichment N+1/dedupe/cap addressed or safely bounded
- [ ] Planning label PR 39 merged: Flutter analyze/test blocking in CI
- [ ] Planning label PR 40 merged: remaining stale docs do not mislead agents/reviewers
- [ ] full local validation green:
  - [ ] `pnpm --filter @project-x/api typecheck`
  - [ ] `pnpm --filter @project-x/api build`
  - [ ] `pnpm --filter @project-x/api test`
  - [ ] `pnpm --filter web build`
  - [ ] `pnpm --filter web lint`
  - [ ] `cd apps/mobile && flutter analyze`
  - [ ] `cd apps/mobile && flutter test`

---

# 8. Standard PR Rules For This Hardening Sprint

Every PR must:

1. Start from clean `main`.
2. Create a dedicated branch.
3. Freeze scope before editing.
4. Touch only intended files.
5. Include raw validation output.
6. Report what was done and what was not done.
7. Avoid future-epic absorption.
8. Stop if validation fails for unclear reasons.
9. Stop if implementation needs architecture changes outside the PR contract.
10. Be reviewed before merge.

---

# 9. Bootstrap Prompt For Future Chat

```text
You are helping me continue work on Project X White Label.

Repo:
- https://github.com/xocliwb-afk/project-x-whitelabel
- Local path: /home/bwilcox/project-x-whitelabel

Current status:
- Epic 14 is complete.
- Epic 15 is complete on main.
- Latest known main includes:
  d665791 chore(epic-15): harden mobile routes and reconcile docs (#36)
- Mobile now has real:
  - public Search screen
  - public Listing Detail screen
  - public local Tour planner/current-tour screen
  - mobile data/state foundation
  - route/widget/controller tests
- We are pausing before Epic 16.

Important:
Do not start Epic 16 yet.
Do not start geofencing.
Do not start TTS playback.
Do not start Android Auto.
Do not start route polylines/maps/navigation handoff.

We ran Claude, Gemini, and Codex repo reviews after Epic 15.
Codex inspected the live repo and passed validation:
- API typecheck/build/test passed
- web build/lint passed
- Flutter analyze/test passed
- repo stayed clean

The key conclusion:
The repo is engineered and solid, not sloppy vibe-coded, but we should run a pre-Epic-16 hardening sprint before adding location/TTS/native complexity.

Critical live-code findings:
1. Tour date/startTime/timeZone semantics need hardening.
2. Tour create/update validation is too shallow.
3. Narration payload validation is weak.
4. Narration enrichment has N+1 listing fetch behavior.
5. Flutter analyze/test is not yet blocking CI.
6. Some docs still contain stale repo-truth drift.

Important, but not blockers before Epic 16:
- splitting big Flutter screen files
- decomposing large web Search files
- removing unused web database dependency
- cleaning CORS preflight config
- rate limiting public listing/search routes
- cleaning static marketing/vendor strings
- revisiting custom tour IDs
- full mobile device/emulator QA
- Android SDK setup
- static marketing multi-tenant modernization

Hardened plan:

Phase 1 — Must do before Epic 16:
GitHub PR #37 — merged:
- Branch: chore/epic-16-tour-contract-hardening
- Goal: harden tour create/update contract and timezone/date/startTime behavior
- No mobile UI, no web UI, no geofencing, no TTS, no Android Auto

GitHub PR #38 — merged:
- Branch: chore/ci-generate-prisma-client
- Goal: generate Prisma client before database build in CI
- Note: this was a CI/database fix, not narration hardening

Next hardening PR candidate:
- Branch: chore/narration-contract-hardening
- Goal: validate narration payloads and fix/bound narration enrichment N+1
- No TTS playback, no geofencing, no Android Auto

Planning label PR 39:
- Branch: ci/mobile-validation
- Goal: make Flutter analyze/test blocking in CI

Planning label PR 40:
- Branch: docs/post-epic-15-truth-cleanup
- Goal: remove remaining stale repo-truth docs drift

Phase 2 — Important before demo/production, but not blockers for Epic 16:
PR 41:
- Branch: chore/api-public-rate-limits
- Goal: rate limit public listing/search routes

PR 42:
- Branch: chore/api-cors-preflight-cleanup
- Goal: clean CORS preflight config

PR 48:
- Full mobile device/emulator QA

PR 49:
- Android SDK setup

Phase 3 — Maintainability/diligence:
PR 43:
- Branch: refactor/mobile-screen-widgets
- Goal: split large Flutter screen files

PR 44:
- Branch: refactor/web-search-surface
- Goal: decompose large web Search files

PR 45:
- Branch: chore/web-remove-unused-database-dependency

PR 46:
- Branch: chore/marketing-vendor-string-cleanup

PR 47:
- Branch: chore/tour-id-strategy-review

PR 50:
- Branch: refactor/marketing-tenant-modernization

Your job in this new chat:
1. Keep me on this hardened plan.
2. Generate precise Codex VS Code prompts one PR at a time.
3. Continue with the next hardening PR candidate only.
4. Do not combine PRs.
5. Require raw git state, live file inspection, validation evidence, and final scope checks.
6. Do not let scope drift into Epic 16.
7. After each Codex result, help me review, commit, push, PR, review, and merge.

Next task:
Give me the Codex VS Code prompt for the next hardening PR candidate:
“chore/narration-contract-hardening”
Narration contract/enrichment hardening only.
```

---

# 10. Historical Codex Prompt For PR 37

PR #37 is merged. This prompt is retained only as an audit artifact for the completed tour contract/timezone hardening work.

```text
You are working in VS Code on this local repo:

- Repo URL: https://github.com/xocliwb-afk/project-x-whitelabel
- Local path: /home/bwilcox/project-x-whitelabel

This is the first pre-Epic-16 hardening PR.

What we are doing now:
Implement PR 37 only — tour contract/timezone hardening.

Do not start Epic 16.
Do not add geofencing.
Do not add TTS/narration playback.
Do not add Android Auto.
Do not add maps.
Do not add route polylines.
Do not add navigation handoff.
Do not touch mobile UI.
Do not touch web UI.
Do not do docs cleanup in this PR.
Do not do CI cleanup in this PR.
Do not do rate limiting in this PR.
Do not refactor unrelated files.

Goal:
Harden the existing tour API contract before Epic 16 begins, especially date/startTime/timeZone semantics and request validation.

Current expected repo state:
- main is clean
- Epic 15 is complete on main
- latest main includes PR #36:
  d665791 chore(epic-15): harden mobile routes and reconcile docs (#36)
- API tests pass
- mobile tests pass
- web build/lint pass

First show raw output for:

git branch --show-current
git status --short
git log --oneline -10
pwd

If repo is clean on main:
create and switch to:

git checkout -b chore/epic-16-tour-contract-hardening

Then inspect before editing:
- apps/api/src/routes/tours.route.ts
- apps/api/src/services/tour.service.ts
- apps/api/src/services/tour.mapper.ts
- apps/api/src/repositories/tour.repository.ts
- apps/api/src/routes/__tests__/tours.route.test.ts if present
- apps/api/src/services/__tests__/**tour** if present
- packages/shared-types/src/tour.ts
- apps/mobile/lib/features/tour/application/tour_draft_controller.dart
- apps/mobile/lib/features/tour/data/tour_repository.dart
- apps/mobile/lib/models/tour.dart
- packages/database/prisma/schema.prisma

Before editing, report:

1. Current tour request/response contract
2. Current date/startTime/timeZone behavior
3. Whether timeZone is currently ignored
4. Current validation weaknesses
5. Existing tour tests
6. Exact implementation plan
7. Exact files you expect to change
8. Exact files you will not touch

Implementation requirements:
- Add strict validation for POST /api/tours.
- Add strict validation for PUT /api/tours/:id.
- Validate:
  - date is YYYY-MM-DD
  - startTime is HH:mm 24-hour time
  - timeZone is a valid IANA timezone if provided
  - stops is a non-empty bounded array
  - listingId is non-empty
  - address is non-empty
  - lat is -90..90
  - lng is -180..180
  - defaultDurationMinutes is within sane positive bounds
  - defaultBufferMinutes is within sane non-negative bounds
- Define explicit behavior when timeZone is omitted.
- Fix scheduling so it does not silently depend on server-local timezone.
- Keep response shapes compatible unless a true bug requires a clear change.
- Prefer Zod or the repo’s existing validation style.
- Use machine-readable error codes where clients may branch.
- Add focused API tests for valid and invalid cases.
- Add timezone scheduling tests.
- Do not alter mobile UI.
- Do not alter web UI.
- Do not implement geofencing/TTS/Android Auto.
- Do not change database schema unless a true blocker is discovered.
- If a new dependency is required for timezone correctness, stop first and explain why before adding it.
- If timezone correctness can be implemented without a new dependency, prefer that.

Validation:
Run and show raw output for:

pnpm --filter @project-x/api typecheck
pnpm --filter @project-x/api build
pnpm --filter @project-x/api test

Then run, if touched behavior could affect mobile models or route assumptions:

cd apps/mobile
flutter analyze
flutter test
cd ../..

Then run:

pnpm --filter web build
pnpm --filter web lint

After implementation, report:

A. Initial repo state
B. Current tour contract before changes
C. Exact contract/timezone changes made
D. Exact validation rules added
E. Files changed
F. Tests added/updated
G. Validation commands and raw output
H. Any behavior intentionally deferred
I. PR-ready summary

Stop conditions:
- repo not clean
- current branch not main before branching
- implementation requires database migration
- implementation requires mobile UI changes
- implementation requires web UI changes
- implementation requires geofencing/TTS/Android Auto scope
- implementation requires unresolved timezone architecture decision
- implementation requires dependency addition without approval
- validation fails and cannot be clearly attributed

Do not commit until I ask.
Do not push.
Do not open a PR.
```

---

## 11. Final Recommendation

GitHub PR #37 and GitHub PR #38 are merged. Do **the next hardening PR candidate** next: narration contract/enrichment hardening.

Do not start Epic 16 until Phase 1 is complete:

1. tour contract/timezone hardening — done
2. CI/database Prisma generation fix — done
3. narration contract/enrichment hardening — not started
4. mobile validation in CI
5. final repo-truth docs cleanup

After that, Epic 16 can begin from a much safer foundation.
