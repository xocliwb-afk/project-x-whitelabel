# Project X White Label — Mobile Map Search V1 Final Plan

**Recommended repo path:** `docs/planning/MOBILE_MAP_SEARCH_V1_FINAL_PLAN.md`
**Prepared:** 2026-05-05
**Project:** Project X White Label
**Repo:** `https://github.com/xocliwb-afk/project-x-whitelabel`
**Local path:** `/home/bwilcox/project-x-whitelabel`
**Recommended epic label:** `Epic 17.5 — Mobile Map Search V1`
**Mode:** Planning-first, contract-first, small PRs only.

---

## 0. Corrected Roadmap Truth

This document intentionally corrects prior stale or contradictory planning language.

Current operating truth:

1. **Epic 16 is the last completed epic.**
2. **Epic 17 has started planning only. Epic 17 is not complete.**
3. **Epic 17.5 — Mobile Map Search V1 happens before Epic 17 implementation resumes.**
4. After Epic 17.5 is complete, the project returns to complete **all of Epic 17**.
5. Epic 18 / deployment planning remains later.

Do **not** describe this work as `pre-Epic-18`.

Do **not** claim Epic 17 foreground TTS, Android Auto, physical-audio validation, or any Epic 17 runtime work is complete unless the live repo and accepted PR history prove it.

If live repo state appears to contradict this roadmap truth, stop and report the exact contradiction before editing implementation files.

---

## 1. Codex Handoff Instruction

Use this file as the corrected final planning source for the mobile map-search epic.

Before creating or editing files, Codex must re-verify current repo state because **current repo state beats old docs and stale assistant summaries**.

Suggested first PR:

```text
Branch: docs/mobile-map-search-v1-contract
Title: docs(mobile): freeze map search v1 contract
Target file: docs/planning/MOBILE_MAP_SEARCH_V1_FINAL_PLAN.md
```

Do **not** begin SDK installation or implementation until the contract PR lands.

---

## 2. Executive Summary

The mobile app needs a real map-first property search experience before returning to Epic 17. A list-only real estate mobile search is not credible. Buyers search spatially: neighborhood, proximity, price distribution, relative location, and listing density all matter.

The current mobile search foundation is useful, but the final search experience must look and behave like a serious consumer property-search app.

The target experience is a full-screen map-first `/search` surface with:

- branded price pins;
- synchronized listing bottom sheet;
- filters;
- sort;
- favorites;
- login prompts for saved/favorite actions;
- manual **Search this area** behavior after pan or zoom.

This should be treated as a **multi-PR mini-epic**, not a single implementation PR.

The safest sequence is:

1. Contract/spec PR.
2. Map SDK foundation PR.
3. Map search state and bbox PR.
4. Map-first `/search` shell PR.
5. Price pins + list synchronization + Search-this-area PR.
6. Filters/sort PR.
7. Favorites/login prompt PR.
8. Android emulator QA + docs closeout PR.

Recommended primary SDK: **Mapbox Maps Flutter**, with a documented fallback rule if Mapbox fails the SDK foundation validation gate.

---

## 3. Repo-Truth Assumptions To Re-Verify

Codex must re-run inspection before implementation.

### Required inspection commands

```bash
git branch --show-current
git status --short
git diff --stat
git log --oneline -15
```

### Expected repo state to verify

- Branch should be `main` or a clean working branch.
- Working tree should be clean before starting.
- Epic 16 should be the last completed epic.
- Epic 17 should be planning-only / not fully implemented.
- Mobile currently has real Search, Listing Detail, and Tour foundations from prior epics.
- Mobile search is currently list-first, not map-first.
- `apps/mobile/pubspec.yaml` does not yet include Mapbox, Google Maps, or `flutter_map`.
- Mobile has no full map-search implementation yet.
- Mobile may not yet have favorites UI/state, even if API favorites exist.
- `/api/listings` should already support bbox, filters, sort, paging, and listing coordinate fields.
- CI should run `flutter pub get`, `flutter analyze`, and `flutter test`.

If any of these are false, Codex must report the exact repo truth and adjust the plan before implementation.

---

## 4. Product Goal

The mobile user should open the app into a serious, polished, map-first property discovery experience:

- Full-screen property map.
- Branded property price pins.
- Draggable synchronized listing sheet.
- Filters and sort reachable without leaving the map.
- Manual **Search this area** after panning or zooming.
- Tap pin/card to listing detail.
- Signed-out users can browse freely.
- Signed-out favorite/save actions prompt login.
- Signed-in favorite actions persist through the existing API.
- Styling follows runtime tenant brand config.

The result should feel app-native and comparable in product thinking to Zillow, Realtor.com, Redfin, or Homes.com, while staying inside Project X White Label architecture.

---

## 5. PR Classification

This is a **multi-PR mini-epic, contract-first**.

It is not:

- a single implementation PR;
- a QA-only PR;
- a docs-only epic;
- a backend-first rewrite;
- a map SDK experiment buried inside a UI PR.

Reason: this touches a new mobile dependency, map rendering, mobile state, listing API query behavior, request cancellation, filter/sort UX, favorites/auth behavior, tests, and Android runtime QA. The repo guardrails require a frozen contract before cross-surface behavior spreads.

---

## 6. Frozen V1 Scope

### In scope

- Convert `/search` into the mobile map-first search surface.
- Add and configure a mobile map SDK.
- Render property price pins from listing results.
- Synchronize selected pin and listing card state.
- Add a draggable bottom sheet/list.
- Add **Search this area** after meaningful pan/zoom.
- Wire map bbox search to existing `/api/listings`.
- Add mobile filters and sort for existing API params.
- Add mobile favorites repository/controller/UI.
- Add signed-out login prompt for favorite actions.
- Keep signed-out browsing public.
- Preserve listing detail handoff through `/listing/:id`.
- Add targeted mobile tests.
- Run Android emulator smoke QA.
- Reconcile docs after QA.

### Hard non-scope

- Epic 17 implementation.
- Geofencing.
- TTS/narration playback changes.
- Android Auto.
- Route polylines.
- Turn-by-turn navigation.
- Google Maps/Waze handoff.
- Foreground service.
- Background location.
- Current-location/GPS permission.
- Platform channels.
- Native Android code beyond SDK-required config.
- iOS signing/release/app-store work.
- Saved searches UI.
- Draw-on-map polygons.
- Schools/commute/crime overlays.
- Lead-capture redesign.
- Listing detail redesign beyond favorite/tap-through compatibility.
- Web map refactor.
- Broad mobile UI redesign outside search map.
- Unrelated snackbar/context assertion fixes.

### Tempting but defer

- Server-side clustering.
- `/api/listings/pins` compact response.
- Approximate total counts.
- Favorite state embedded in listing responses.
- Saved homes screen.
- Search autocomplete/geocode UX expansion.
- Use-my-location GPS centering.
- Offline maps.
- Native navigation handoff.

---

## 7. Map SDK Decision

### Recommendation

Use **Mapbox Maps Flutter** as the primary V1 SDK.

### Why Mapbox fits Project X

- The existing web app already uses Mapbox.
- Existing web bbox behavior aligns with `minLng,minLat,maxLng,maxLat`.
- Mapbox is strong for branded map styles, GeoJSON sources, symbol layers, annotations, and price-pin style UX.
- It supports a visual search map while keeping geofencing/TTS/Android Auto concerns separate.
- It best preserves web/mobile parity for a white-label real estate product.

### Why not Google Maps as primary

Google Maps Flutter is mature and credible, but it diverges from the current web Mapbox architecture, introduces separate Google Cloud/API key setup, and makes high-quality dynamic price-pin rendering more bitmap-oriented. It is the first fallback if Mapbox fails validation.

### Why not `flutter_map` as primary

`flutter_map` is attractive because it is pure Flutter and easier for custom marker widgets, but it creates tile-provider/commercial policy decisions, weaker web parity, and likely a lower ceiling for a final production-facing real estate map. It is an emergency fallback if native SDK setup or token policy blocks both Mapbox and Google Maps.

### Fallback rule to freeze in PR 1

```text
Primary: Mapbox Maps Flutter
Fallback A: Google Maps Flutter if Mapbox fails validation or Mapbox account/token policy is blocked
Fallback B: flutter_map only if the project explicitly prioritizes zero-native setup over Mapbox/web parity
```

### SDK PR stop condition

If the Mapbox foundation PR cannot pass:

```bash
cd apps/mobile
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
```

without unacceptable SDK/platform churn, stop and present the fallback choice. Do not proceed to pins, filters, or favorites.

### Required config decisions

Codex must verify exact current SDK requirements before implementation. The contract PR should freeze:

- public mobile token name, recommended: `MAPBOX_ACCESS_TOKEN`;
- no tokens committed to repo;
- no secrets printed in logs;
- Android/iOS SDK/platform requirements;
- whether Mapbox package download credentials are needed locally or in CI;
- whether `flutter build apk --debug` is a required validation gate for the SDK PR.

---

## 8. UX Specification

### Route behavior

Use `/search`. Do not create a parallel `/map` route for V1.

Recommended product change:

- Authenticated `/` redirects to `/search`.
- Signed-out `/` should also redirect to `/search`, not `/login`.

Reason: buyers should browse first and authenticate only for favorites/saved actions.

If product ownership wants the demo gated, keep signed-out `/` -> `/login`, but `/search` itself must remain public.

### Screen layout

Use a full-screen map under a floating UI stack:

- Background: full-screen map.
- Top overlay: search/location pill, filter button, sort/account controls.
- Middle overlay: **Search this area** button.
- Bottom overlay: draggable listing sheet.

### Bottom sheet snap states

- Collapsed: listing count or selected-card preview.
- Half: main property-card browsing state.
- Expanded: list-first scanning mode.

The map/list relationship should preserve spatial context. A hard map/list toggle is optional later, not primary V1.

### Price pins

Pins should be price labels, not generic markers:

- Examples: `$425K`, `$1.2M`.
- Use tenant brand colors with accessible foreground contrast.
- Selected pin gets accent/border/scale treatment.
- Favorited listings get a heart treatment.
- Listings with invalid/missing coordinates do not render as pins.

### Selected state

Single source of truth: `selectedListingId`.

- Tap pin -> select listing -> snap/open bottom sheet -> highlight matching card.
- Tap card -> select listing -> optionally center/animate map to pin.
- Tap selected card or preview CTA -> open `/listing/:id`.
- Tap empty map -> clear selection, not results.

### Search-this-area behavior

Manual refresh is required for V1.

Track:

- visible bbox;
- committed/search bbox;
- last successful bbox;
- camera center/zoom;
- user camera movement vs programmatic camera movement.

Show **Search this area** when the user has materially moved the camera after the last committed search. Do not fetch on every camera movement.

### Filters

V1 filters should map to existing API params:

- price min/max;
- beds;
- baths;
- property type;
- status;
- sqft min/max;
- year built min/max;
- max days on market;
- keywords.

Use a bottom sheet with Apply and Reset. Applying filters re-runs the query using the current committed bbox.

### Sort

Use existing sort values:

- `newest`;
- `price-asc`;
- `price-desc`;
- `dom`.

Sort belongs in the sheet header or top overlay. Sort changes re-run the query using the active bbox.

### Favorites and login prompt

- Signed-out users can browse map and detail.
- Signed-out heart tap opens login prompt.
- Signed-in heart tap optimistically toggles favorite.
- Failed mutation rolls back state.
- Logout clears favorite IDs.
- Favorite API remains authoritative and auth-gated.

Recommended prompt copy:

```text
Log in to save this home.
```

### Empty/loading/error states

- Initial loading: map shell + sheet skeleton.
- Refreshing after Search-this-area: keep old pins visible and show `Searching...` indicator.
- Empty: `No homes found in this area` plus clear filters/zoom out action.
- Error: keep map and prior results when available, show retry.
- Rate limited: use machine-readable code and backoff copy.

### Accessibility

- Minimum 44-48dp touch targets.
- Semantic labels for pins: price, beds/baths/sqft/address when available.
- Bottom sheet has accessible drag handle and focus order.
- Keep a list-mode escape if map gestures are difficult.
- Use brand foreground/background pairs, not arbitrary colors.

---

## 9. API/Search Contract

### V1 endpoint

Use existing:

```text
GET /api/listings
```

No new endpoint is required for V1.

### Bbox format

```text
bbox=minLng,minLat,maxLng,maxLat
```

### Query params mobile should send

```text
bbox
page
limit
sort
status
q
minPrice
maxPrice
beds
maxBeds
baths
maxBaths
propertyType
minSqft
maxSqft
minYearBuilt
maxYearBuilt
maxDaysOnMarket
keywords
cities
postalCodes
counties
neighborhoods
features
subtype
```

### Recommended initial limits

- Initial map viewport query: `limit=50`.
- Server cap must be verified in current repo before implementation.
- Render pins from page 1 only for V1.
- Bottom sheet may paginate within the committed bbox.

### Response fields needed for pins

Existing listing DTO should provide:

```text
id
address.lat
address.lng
listPrice
listPriceFormatted
details.status
```

### Response fields needed for cards

```text
id
listPriceFormatted
address.full
media.thumbnailUrl
details.beds
details.baths
details.sqft
details.status
meta.daysOnMarket
```

### Error codes/handling

Mobile must branch on stable codes, not message text.

Expected cases:

- `400 BAD_REQUEST` or `VALIDATION_ERROR` for invalid bbox/filter/page.
- `401 UNAUTHENTICATED` for favorites without token.
- `403 TENANT_MISMATCH` or equivalent for auth/tenant conflict.
- `429 RATE_LIMITED` for public listing rate limit.
- `500 INTERNAL_ERROR` only for true server failures.

### Favorites API

Use existing endpoints, if present in the live repo:

```text
GET /api/favorites/ids
POST /api/favorites
DELETE /api/favorites/:listingId
```

Expected behavior:

- public browsing does not require auth;
- favorites require auth;
- favorites are tenant/user scoped;
- mobile signs out -> local favorite state clears;
- mobile signs in -> hydrate favorite IDs.

If favorites API endpoints are missing or differ, stop and report the repo truth before implementing mobile favorites.

### Deferred API improvements

Do not build in V1 unless performance evidence demands it:

- `/api/listings/pins`;
- `view=map`;
- server-side clustering;
- compact response;
- total/approximate count;
- favorite state embedded in listing response.

---

## 10. Mobile Technical Architecture

### Do not broadly refactor state management

The existing app uses Riverpod 2.x patterns. Do not migrate the app to Riverpod 3.x in this epic.

Keep the current pattern:

```text
Widget -> controller/provider -> repository -> ApiClient
```

### Proposed structure

```text
apps/mobile/lib/features/search/
  application/
    map_search_controller.dart
    map_viewport_state.dart
    search_filter_state.dart
    selected_listing_provider.dart
  data/
    listings_repository.dart
  presentation/
    screens/
      search_screen.dart
    widgets/
      property_map.dart
      price_pin_layer.dart
      map_listing_sheet.dart
      search_area_button.dart
      search_filter_sheet.dart
      search_sort_control.dart

apps/mobile/lib/features/favorites/
  application/
    favorites_controller.dart
  data/
    favorites_repository.dart
  presentation/
    favorite_button.dart
    sign_in_to_save_sheet.dart
```

### State to track

```text
draftVisibleBbox
committedSearchBbox
lastSuccessfulBbox
cameraCenter
zoom
isMapReady
hasPendingSearchArea
selectedListingId
activeFilters
activeSort
favoriteIds
favoriteMutationState
```

### Request control

Add optional Dio `CancelToken` support to `ApiClient.searchListings` if the current API client lacks it.

Rules:

- Cancel stale requests on new committed bbox search.
- Keep previous results visible while refreshing.
- Drop stale responses using request generation/sequence ID.
- Do not auto-fetch on every camera movement.
- Do not auto-retry favorite mutations.

### Bbox conversion

Map visible bounds must convert to:

```text
minLng,minLat,maxLng,maxLat
```

Round consistently enough to avoid excessive duplicate searches.

### Pagination

- Map pins render page 1 only in V1.
- Bottom sheet load-more preserves committed bbox/filter/sort.
- Do not mix page 2 from old bbox with draft unsaved camera bbox.

### Pin/list synchronization

- `selectedListingId` drives selected pin and selected card.
- Pin tap selects card and opens/snaps bottom sheet.
- Card tap selects pin and can open detail.
- Avoid infinite sync loops from programmatic camera/list movement.

### Favorites integration

- Hydrate favorite IDs only when authenticated.
- Clear favorite IDs on logout.
- Optimistic POST/DELETE with rollback.
- Signed-out favorite tap opens prompt, does not call API.

---

## 11. PR Sequence

### PR 1 — Contract/spec

**Branch:** `docs/mobile-map-search-v1-contract`
**Title:** `docs(mobile): freeze map search v1 contract`

Scope:

- Add/replace `docs/planning/MOBILE_MAP_SEARCH_V1_FINAL_PLAN.md`.
- Freeze corrected roadmap truth: Epic 16 complete, Epic 17 planned/not complete, Epic 17.5 goes first.
- Freeze SDK decision: Mapbox primary, fallback rule.
- Freeze bbox format.
- Freeze route behavior.
- Freeze public browsing/favorites auth behavior.
- Freeze test/QA matrix.
- Freeze hard non-scope.

Acceptance:

- No implementation code.
- Explicit contract table.
- Explicit non-scope.
- Explicit SDK fallback rule.
- Validation commands listed.
- No claim that Epic 17 is complete.

Validation:

```bash
git diff --check
```

### PR 2 — Mapbox SDK foundation

**Branch:** `feature/mobile-mapbox-foundation`
**Title:** `feat(mobile): add Mapbox map search foundation`

Scope:

- Add `mapbox_maps_flutter`.
- Add `MAPBOX_ACCESS_TOKEN` app config via `--dart-define`.
- Add Mapbox initialization/wrapper.
- Render an empty map centered from brand defaults/fallback.
- Keep old list screen behind temporary feature fallback if necessary.

Acceptance:

- Flutter analyze/test pass.
- Debug Android build passes.
- Map renders on emulator with token.
- Missing token fails clearly, no secret printed.
- No pins or listing API work yet.

Validation:

```bash
cd apps/mobile
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
```

Stop condition:

- If Mapbox cannot pass Flutter analyze/test/debug build without unacceptable SDK/platform churn, stop and present fallback choice: Google Maps vs flutter_map.

### PR 3 — Map search state + bbox contract

**Branch:** `feature/mobile-map-search-state`
**Title:** `feat(mobile): add map viewport and bbox search state`

Scope:

- Add viewport/camera state.
- Track draft vs committed bbox.
- Add cancellation/generation guard.
- Add `searchByBbox`.
- Preserve existing list-first UI if needed.

Acceptance:

- bbox string uses `minLng,minLat,maxLng,maxLat`.
- stale responses are dropped/canceled.
- load-more uses committed bbox.
- tests cover bbox formatting and stale request behavior.

Validation:

```bash
pnpm --filter @project-x/api test
cd apps/mobile
flutter analyze
flutter test
```

### PR 4 — Map-first `/search` shell

**Branch:** `feature/mobile-map-search-shell`
**Title:** `feat(mobile): make search screen map-first`

Scope:

- Convert `/search` to map-first layout.
- Add top controls.
- Add draggable bottom sheet shell.
- Show loading/empty/error states.
- Preserve detail navigation.

Acceptance:

- `/search` opens full-screen map shell.
- Bottom sheet renders listing cards from current provider state.
- Existing listing detail route still works.
- No favorites yet.

Validation:

```bash
cd apps/mobile
flutter analyze
flutter test
```

### PR 5 — Pins + list sync + Search this area

**Branch:** `feature/mobile-map-pins-list-sync`
**Title:** `feat(mobile): add price pins and synchronized listing sheet`

Scope:

- Render price pins from first page of results.
- Selected pin/card state.
- Pin tap snaps sheet/highlights card.
- Card tap selects pin and opens detail.
- Manual Search-this-area flow.

Acceptance:

- Pins and cards represent same committed result set.
- Map pan shows Search-this-area.
- Button re-runs bbox query.
- No request storm.
- No route/navigation/geolocation work.

Validation:

```bash
cd apps/mobile
flutter analyze
flutter test
```

### PR 6 — Filters and sort

**Branch:** `feature/mobile-map-filters-sort`
**Title:** `feat(mobile): add filters and sort to map search`

Scope:

- Filter bottom sheet.
- Sort control.
- Clear/reset.
- Query mapping to existing API params.

Acceptance:

- Price/beds/baths/property type/status work.
- Sort values match API.
- Filters apply to committed bbox.
- Empty state distinguishes `no homes` vs `too many filters`.

Validation:

```bash
pnpm --filter @project-x/api test
cd apps/mobile
flutter analyze
flutter test
```

### PR 7 — Favorites + login prompt

**Branch:** `feature/mobile-map-favorites-login`
**Title:** `feat(mobile): add favorites and login prompt to map search`

Scope:

- Favorites repository/controller.
- API client methods for favorites.
- Heart buttons on map cards/preview/detail where appropriate.
- Signed-out prompt.
- Signed-in optimistic toggle.

Acceptance:

- Signed-out users browse.
- Signed-out favorite tap prompts login.
- Signed-in favorite toggles persist.
- 401/403/failure rolls back state.
- Logout clears local favorites.

Validation:

```bash
pnpm --filter @project-x/api test
cd apps/mobile
flutter analyze
flutter test
```

### PR 8 — QA/stabilization/docs

**Branch:** `qa/mobile-map-search-v1`
**Title:** `qa(mobile): validate map search v1 on Android`

Scope:

- Android emulator smoke.
- Docs update.
- Feature matrix/tracker update.
- Known gaps explicitly recorded.
- Optional feature flag flip if QA passes.

Acceptance:

- Search map renders.
- Initial bbox results load.
- Pan/zoom Search-this-area works.
- Pin/card/detail handoff works.
- Filters/sort work.
- Signed-out favorite prompt works.
- Signed-in favorite toggle works if credentials available.
- No geofence/TTS/Android Auto invoked.
- No production claim unless physical-device QA is done.

Validation:

```bash
pnpm --filter @project-x/shared-types build
pnpm --filter @project-x/api typecheck
pnpm --filter @project-x/api build
pnpm --filter @project-x/api test
pnpm --filter web build
pnpm --filter web lint

cd apps/mobile
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
```

---

## 12. QA Matrix

| Area | Required proof |
|---|---|
| App boot | Valid tenant/env loads map screen |
| Map render | Mapbox map visible on Android emulator |
| Initial results | `/api/listings?bbox=...` returns and pins/cards appear |
| Pan/zoom | Button appears only after meaningful movement |
| Search this area | Commits current bbox and refreshes pins/cards |
| Pin selection | Pin highlights and bottom sheet syncs |
| Card selection | Card highlights/opens detail |
| Detail handoff | `/listing/:id` opens with preview/fetch behavior intact |
| Filters | Price/beds/baths/type/status map to API params |
| Sort | newest/price/dom sort maps to API |
| Empty state | No homes message + clear filters |
| Error state | Retry without losing old map state |
| Signed-out favorite | Login prompt only, no mutation |
| Signed-in favorite | Optimistic toggle + persisted server call |
| Logout | Favorite IDs clear |
| Performance | No request storm during map drag |
| Regression | Existing tour/mobile tests still green |
| Non-scope | No GPS/geofence/TTS/Android Auto side effects |

---

## 13. Risk Register

| Risk | Severity | Mitigation |
|---|---:|---|
| Mapbox dependency fails current Flutter/Android build | High | Isolate in PR 2; stop and fallback if debug APK cannot build |
| Mapbox token/licensing ambiguity | High | Freeze `MAPBOX_ACCESS_TOKEN` policy in PR 1; never commit token |
| Plugin/native artifacts pollute PR | Medium | Follow generated artifact guardrails; inspect `git status` after `flutter pub get/build` |
| API request storm on map movement | High | Manual Search-this-area + debounce + CancelToken |
| Race condition between stale bbox requests | High | generation ID + active committed bbox |
| Too many pins jank map | High | cap first-page pins; use Mapbox layers/GeoJSON if needed; no V1 clustering rewrite |
| Favorites auth leaks protected behavior | High | UI prompt only; API remains auth-required |
| Tenant mismatch/missing tenant | High | keep tenant centralized in ApiClient; no UI-passed tenant |
| Existing tests assume list-first search | Medium | update tests in shell PR only |
| Bottom sheet/map gesture conflict | Medium | snap points, drag handle, accessibility escape |
| Brand colors fail contrast | Medium | use theme foreground pairs; test dark/light brand variants |
| Scope creep into navigation/location/TTS | High | repeat hard non-scope in every PR body |
| Web parity overreach | Medium | copy concepts only, not web lens UI |
| Emulator map works but physical device not tested | Medium | QA doc must distinguish emulator vs physical |
| API payload too heavy for map | Medium | measure first; defer slim `/pins` endpoint |

---

## 14. Local Inspection Checklist Before PR 1

Codex should inspect:

```text
git branch --show-current
git status --short
git diff --stat
git log --oneline -15

apps/mobile/pubspec.yaml
apps/mobile/lib/main.dart
apps/mobile/lib/core/config/app_config.dart
apps/mobile/lib/core/theme/app_theme.dart
apps/mobile/lib/core/routing/app_router.dart
apps/mobile/lib/providers/api_provider.dart
apps/mobile/lib/providers/auth_provider.dart
apps/mobile/lib/services/api_client.dart
apps/mobile/lib/services/auth_interceptor.dart
apps/mobile/lib/models/listing.dart
apps/mobile/lib/models/listing_search_response.dart
apps/mobile/lib/models/brand_config.dart
apps/mobile/lib/features/search/application/listing_search_controller.dart
apps/mobile/lib/features/search/data/listings_repository.dart
apps/mobile/lib/features/search/presentation/screens/search_screen.dart
apps/mobile/lib/features/listing_detail/presentation/screens/listing_detail_screen.dart
apps/mobile/test/features/search/*
apps/mobile/test/features/listing_detail/*

apps/mobile/android/app/build.gradle
apps/mobile/android/build.gradle
apps/mobile/android/app/src/main/AndroidManifest.xml
apps/mobile/ios/Runner/Info.plist

apps/api/src/routes/listings.route.ts
apps/api/src/utils/listingSearch.util.ts
apps/api/src/routes/favorites.route.ts
apps/api/src/services/favorite.service.ts
apps/api/src/middleware/auth.ts
apps/api/src/middleware/tenant.ts

packages/shared-types/src/index.ts
packages/shared-types/src/favorite.ts
packages/shared-types/src/brand.ts
packages/shared-types/src/brand-schema.ts

.github/workflows/ci.yml
turbo.json
docs/planning/PROJECT_X_WHITE_LABEL_FEATURE_MATRIX.md
docs/planning/PROJECT_X_WHITE_LABEL_MASTER_PR_TRACKER.md
docs/planning/EPIC_IMPLEMENTATION_GUARDRAILS.md
```

---

## 15. Final Recommendation

Start with:

```text
PR 1 — docs(mobile): freeze map search v1 contract
```

Freeze:

- corrected roadmap truth: Epic 16 complete, Epic 17 planned/not complete, Epic 17.5 first;
- `/search` becomes map-first;
- Mapbox Maps Flutter is primary SDK;
- fallback rule if Mapbox fails validation;
- `/api/listings` remains V1 endpoint;
- bbox format is `minLng,minLat,maxLng,maxLat`;
- public browse remains allowed;
- unauthenticated `/` should redirect to `/search`, not `/login`, unless product owner says otherwise;
- favorites are auth-gated and tenant-scoped;
- manual **Search this area** is the only pan/zoom fetch trigger;
- no geofence/TTS/Android Auto/native navigation/GPS/location;
- validation gates and Android emulator QA.

Then proceed with SDK foundation. Do **not** install the map SDK before the contract lands.

After Epic 17.5 is complete, return to Epic 17 and complete the full Epic 17 scope in its own contract/implementation sequence.
