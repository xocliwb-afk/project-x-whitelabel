# Epic 17.5 - Mobile Map Search V1 Contract

**Status:** Frozen implementation contract for Epic 17.5 Mobile Map Search V1.
**Source plan:** `docs/planning/MOBILE_MAP_SEARCH_V1_FINAL_PLAN.md`
**Mode:** Contract/spec only. No SDK installation or implementation belongs in this PR.

---

## 1. Status / Roadmap Truth

This contract freezes the corrected roadmap truth for the mobile map-search mini-epic:

- Epic 16 is the last completed epic.
- Epic 17 has started planning only and is not complete.
- Epic 17.5 - Mobile Map Search V1 runs before Epic 17 implementation resumes.
- After Epic 17.5 is complete, the project returns to complete all of Epic 17.
- Epic 18 and deployment planning stay later.

Old commit labels, stale planning docs, or assistant summaries must not be used to claim Epic 17 is complete. If live repo state appears to contradict this roadmap, stop and report the exact contradiction before implementation work.

### Implementation closeout - 2026-05-05

Epic 17.5 implementation PRs #74-#80 are merged and PR 8 is the QA/docs closeout:

| PR | Title | Status |
|---:|---|---|
| #74 | `docs(mobile): freeze map search v1 contract` | Complete |
| #75 | `feat(mobile): add Mapbox map search foundation` | Complete |
| #76 | `feat(mobile): add map viewport and bbox search state` | Complete |
| #77 | `feat(mobile): add map-first search shell` | Complete |
| #78 | `feat(mobile): add map price pins and list sync` | Complete |
| #79 | `feat(mobile): add map search filters and sort` | Complete |
| #80 | `feat(mobile): add favorites and login prompt to map search` | Complete |
| PR 8 | `qa(mobile): close out map search v1 Android smoke` | In QA/docs closeout |

Android emulator QA on 2026-05-05 produced a PARTIAL PASS because `MAPBOX_ACCESS_TOKEN` was not present and the tested AVD had an existing signed-in session. The implementation is complete with token-backed real Mapbox rendering and clean signed-out prompt validation still required before production deployment.

Epic 17 remains incomplete. After Epic 17.5 closeout, work returns to Epic 17.

---

## 2. Purpose

Mobile search must become a credible consumer property-search experience before Epic 17 implementation resumes. A list-only mobile search is insufficient because buyers search spatially: neighborhood context, location tradeoffs, nearby inventory, price clusters, and listing density are core to the search task.

Epic 17.5 turns `/search` into a map-first mobile experience while preserving the current Project X architecture, public browsing, tenant branding, and existing listing API contract.

---

## 3. Current Repo Truth To Verify Before Implementation

Before any implementation PR, re-run:

```bash
git branch --show-current
git status --short
git diff --stat
git log --oneline -15
```

Expected high-level state:

- Clean branch before edits.
- `docs/planning/MOBILE_MAP_SEARCH_V1_FINAL_PLAN.md` exists.
- Mobile search is still list-first.
- Mobile has no full map-search implementation.
- `apps/mobile/pubspec.yaml` does not yet contain Mapbox, Google Maps, or `flutter_map`.
- `/api/listings` supports bbox, filters, sort, paging, and listing coordinates.
- Favorites API exists or must be verified before mobile favorites implementation.
- CI runs mobile `flutter pub get`, `flutter analyze`, and `flutter test`.

Relevant files to inspect before implementation:

```text
apps/mobile/pubspec.yaml
apps/mobile/lib/main.dart
apps/mobile/lib/core/config/app_config.dart
apps/mobile/lib/core/routing/app_router.dart
apps/mobile/lib/core/theme/app_theme.dart
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
docs/planning/MOBILE_MAP_SEARCH_V1_FINAL_PLAN.md
docs/planning/EPIC_IMPLEMENTATION_GUARDRAILS.md
docs/planning/PROJECT_X_WHITE_LABEL_MOBILE_ARCHITECTURE.md
docs/planning/PROJECT_X_WHITE_LABEL_FEATURE_MATRIX.md
docs/planning/PROJECT_X_WHITE_LABEL_MASTER_PR_TRACKER.md
```

---

## 4. Product Goal

The V1 mobile search experience is a full-screen map-first `/search` surface with:

- property price pins;
- synchronized draggable bottom sheet/list;
- manual Search this area after pan or zoom;
- map-accessible filters and sort;
- favorite controls with signed-out login prompts;
- listing detail tap-through;
- signed-out browsing;
- runtime white-label brand styling.

The experience should feel app-native and comparable in product quality to major consumer property-search apps while staying inside Project X's existing architecture.

---

## 5. Explicit In-Scope

- Convert `/search` into the mobile map-first search surface.
- Add and configure one mobile map SDK.
- Render property price pins from listing results.
- Synchronize selected pin and listing card state.
- Add a draggable bottom sheet/list.
- Add Search this area after meaningful pan/zoom.
- Wire map bbox search to existing `GET /api/listings`.
- Add mobile filters and sort for existing API params.
- Add mobile favorites repository/controller/UI.
- Add signed-out login prompt for favorite actions.
- Keep signed-out browsing public.
- Preserve listing detail handoff through `/listing/:id`.
- Add targeted mobile tests.
- Run Android emulator smoke QA.
- Reconcile docs after QA.

---

## 6. Explicit Non-Scope

Epic 17.5 V1 must not absorb:

- geofencing;
- TTS/narration playback changes;
- Android Auto;
- route polylines;
- turn-by-turn navigation;
- Google Maps/Waze handoff;
- foreground service;
- background location;
- GPS/current-location permissions;
- platform channels;
- custom native Android code beyond SDK-required config;
- iOS signing, release, or App Store work;
- saved searches UI;
- draw-on-map polygons;
- schools, commute, or crime overlays;
- lead-capture redesign;
- broad listing detail redesign;
- web map refactor;
- broad mobile redesign outside search/map/favorites/login entry points;
- unrelated snackbar/context assertion fixes.

---

## 7. SDK Contract

Primary SDK recommendation: **Mapbox Maps Flutter**.

Fallback rule:

```text
Primary: Mapbox Maps Flutter
Fallback A: Google Maps Flutter if Mapbox fails validation or token/account policy blocks it
Fallback B: flutter_map only if zero-native setup is explicitly prioritized over Mapbox/web parity
```

Reasons for Mapbox primary:

- The web app already uses Mapbox.
- Existing bbox behavior aligns with `minLng,minLat,maxLng,maxLat`.
- Mapbox supports branded map styles, GeoJSON sources, symbol layers, annotations, and price-pin map UX.
- It preserves web/mobile search parity while keeping location, geofence, TTS, Android Auto, and navigation concerns separate.

SDK validation stop condition:

If the SDK foundation PR cannot pass the mobile validation gate without unacceptable SDK/platform churn, stop and present the fallback choice before continuing to pins, filters, favorites, or UI shell work.

Required token/env handling:

- Recommended public mobile token name: `MAPBOX_ACCESS_TOKEN`.
- Token must be provided through runtime/build config such as `--dart-define`.
- No tokens or secrets may be committed.
- No secrets may be printed in logs, PR bodies, or QA docs.
- Server-only Mapbox geocoding tokens must remain server-only.
- SDK-required Android/iOS config must be documented before implementation; no custom platform channels or hand-written native app code unless explicitly approved after SDK validation.

---

## 8. Route Contract

- `/search` is the V1 mobile map-search route.
- Do not create a separate `/map` route for V1.
- Signed-out browsing remains public.
- Product decision: signed-out `/` should redirect to `/search` so buyers can browse first and authenticate only for saved/favorite actions.
- If product ownership intentionally keeps signed-out `/` gated for demo reasons, `/search` itself must still remain public.
- `/listing/:id` remains the listing detail route and must continue to support tap-through from map/list cards.

---

## 9. UX Contract

Screen layout:

- Full-screen map as the primary surface.
- Floating top overlay for search/location text, filters, sort/account actions.
- Floating Search this area button when the user has moved the map after the last committed search.
- Draggable bottom sheet over the map.

Bottom sheet snap states:

- Collapsed: count or selected listing preview.
- Half: primary card browsing state.
- Expanded: list scanning state.

Pins:

- Use price pins such as `$425K` or `$1.2M`, not generic markers.
- Use runtime brand colors with accessible contrast.
- Selected pin receives accent/border/scale treatment.
- Favorited listing pins/cards show heart state.
- Listings with invalid/missing coordinates do not render as pins.

Selection:

- Single source of truth: `selectedListingId`.
- Pin tap selects listing, highlights card, and snaps/opens bottom sheet.
- Card tap selects pin and may center/animate map.
- Card or preview CTA opens `/listing/:id`.
- Empty-map tap clears selection, not results.

Search this area:

- Track draft visible bbox and committed search bbox.
- Show the button only after meaningful user pan/zoom.
- Do not fetch on every camera movement.
- Programmatic camera movement must not falsely trigger Search this area.

Filters:

- Use a bottom sheet with Apply and Reset.
- V1 filters map only to existing `/api/listings` params.
- Applying filters re-runs the query using the current committed bbox.

Sort:

- Supported values: `newest`, `price-asc`, `price-desc`, `dom`.
- Sort changes re-run the query using the active bbox.

Favorites/login:

- Signed-out users can browse map, cards, and detail.
- Signed-out heart tap opens a login prompt and does not call the API.
- Signed-in heart tap optimistically toggles favorite.
- Failed mutation rolls back local state.
- Logout clears local favorite IDs.

States:

- Initial loading: map shell and sheet skeleton.
- Refreshing: keep prior pins/cards visible and show a searching indicator.
- Empty: "No homes found in this area" with clear filters or zoom out action.
- Error: keep prior map/list state when available and show retry.
- Rate limited: use machine-readable code and backoff copy.

Accessibility:

- Minimum 44-48dp touch targets.
- Semantic labels for pins/cards where practical.
- Accessible drag handle and focus order for bottom sheet.
- List-mode escape path for users who struggle with map gestures.
- Brand color pairs must preserve contrast.

---

## 10. API/Search Contract

V1 endpoint:

```text
GET /api/listings
```

Bbox format:

```text
bbox=minLng,minLat,maxLng,maxLat
```

Mobile may send:

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

Recommended V1 limits:

- Initial map viewport query: `limit=50`.
- Render pins from page 1 only.
- Bottom sheet may paginate within the committed bbox/filter/sort.
- Verify server cap in live repo before implementation.

Fields required for pins:

```text
id
address.lat
address.lng
listPrice
listPriceFormatted
details.status
```

Fields required for cards:

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

Expected handling:

- Invalid bbox/filter/page: `400` with stable validation code.
- Favorite without auth: `401` with stable auth code.
- Tenant/auth mismatch: `403` with stable tenant/auth code.
- Rate limit: `429 RATE_LIMITED`.
- Server failure: `500 INTERNAL_ERROR` or current repo equivalent.

Clients must branch on machine-readable codes, not message text.

Favorites endpoints, if present in live repo:

```text
GET /api/favorites/ids
POST /api/favorites
DELETE /api/favorites/:listingId
```

Favorites rules:

- Public browsing does not require auth.
- Favorites require auth.
- Favorites are tenant/user scoped.
- Sign-out clears local favorite state.
- Sign-in hydrates favorite IDs.

Deferred API changes are not allowed in V1 unless measured performance forces them:

- `/api/listings/pins`;
- `view=map`;
- server-side clustering;
- compact response;
- total/approximate count;
- favorite state embedded in listing response.

---

## 11. Mobile Architecture Contract

Do not broadly refactor state management. Keep the current pattern:

```text
Widget -> controller/provider -> repository -> ApiClient
```

Do not migrate Riverpod versions or rewrite unrelated mobile foundations.

Proposed feature structure:

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

State to track:

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

Request control:

- Add optional Dio `CancelToken` support to `ApiClient.searchListings` if missing.
- Cancel stale requests on new committed bbox search.
- Keep previous results visible while refreshing.
- Drop stale responses using request generation/sequence ID.
- Do not auto-fetch on camera movement.
- Do not auto-retry favorite mutations.

Bbox state:

- Draft bbox follows user camera movement.
- Committed bbox drives API results.
- Page 2/load-more always uses committed bbox/filter/sort.
- Never mix old-result pagination with unsaved draft camera bbox.

Selection sync:

- `selectedListingId` drives selected pin and selected card.
- Avoid loops from programmatic camera/list movement.
- Card/list selection and pin selection must stay in one controller state.

Brand/theming:

- Map controls and pins use tenant brand colors where contrast is safe.
- Use theme foreground/background pairs.
- Do not hardcode Project X-only visual identity into reusable search UI.

---

## 12. PR Sequence

### PR 2 - SDK foundation

- Branch: `feature/mobile-mapbox-foundation`
- Title: `feat(mobile): add Mapbox map search foundation`
- Scope: add SDK/config, token handling, map wrapper, empty map centered from brand defaults/fallback.
- Validation: `cd apps/mobile && flutter pub get && flutter analyze && flutter test && flutter build apk --debug`
- Non-scope: no pins, listing API work, filters, favorites, location, geofence, TTS, Android Auto.

### PR 3 - Map search state/bbox

- Branch: `feature/mobile-map-search-state`
- Title: `feat(mobile): add map viewport and bbox search state`
- Scope: viewport state, draft vs committed bbox, cancellation/generation guard, bbox search.
- Validation: `pnpm --filter @project-x/api test`; `cd apps/mobile && flutter analyze && flutter test`
- Non-scope: no final map shell, favorites, route/navigation/location features.

### PR 4 - Map-first shell

- Branch: `feature/mobile-map-search-shell`
- Title: `feat(mobile): make search screen map-first`
- Scope: full-screen map shell, top controls, draggable bottom sheet, loading/empty/error states, detail navigation preserved.
- Validation: `cd apps/mobile && flutter analyze && flutter test`
- Non-scope: no favorites, no geofence/TTS/Android Auto/navigation work.

### PR 5 - Price pins/list sync/Search this area

- Branch: `feature/mobile-map-pins-list-sync`
- Title: `feat(mobile): add price pins and synchronized listing sheet`
- Scope: price pins, selected pin/card sync, Search this area manual refresh.
- Validation: `cd apps/mobile && flutter analyze && flutter test`
- Non-scope: no request storm, no GPS/location permission, no server clustering.

### PR 6 - Filters/sort

- Branch: `feature/mobile-map-filters-sort`
- Title: `feat(mobile): add filters and sort to map search`
- Scope: filter sheet, sort control, clear/reset, query mapping.
- Validation: `pnpm --filter @project-x/api test`; `cd apps/mobile && flutter analyze && flutter test`
- Non-scope: no new backend endpoint unless a measured blocker is proven.

### PR 7 - Favorites/login prompt

- Branch: `feature/mobile-map-favorites-login`
- Title: `feat(mobile): add favorites and login prompt to map search`
- Scope: favorites repository/controller, API methods, heart buttons, signed-out prompt, signed-in optimistic toggle.
- Validation: `pnpm --filter @project-x/api test`; `cd apps/mobile && flutter analyze && flutter test`
- Non-scope: no saved searches UI, no lead capture redesign, no broad auth rewrite.

### PR 8 - QA/docs closeout

- Branch: `qa/mobile-map-search-v1-closeout`
- Title: `qa(mobile): close out map search v1 Android smoke`
- Scope: Android emulator smoke, QA doc, feature matrix/tracker update if needed, known gaps.
- Validation: full cross-surface gate plus emulator manual QA.
- Non-scope: no new implementation hidden in QA.

---

## 13. Validation Gates

Cross-surface implementation gates:

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

Docs-only contract PR gate:

```bash
git diff --check
```

No Flutter package installation is required for this contract PR.

---

## 14. QA Matrix

Android emulator QA scenarios required before closeout:

| Scenario | Required result |
|---|---|
| App boot | Valid tenant/env loads the app without fatal error |
| Map load | Map renders on Android emulator with configured token, or missing-token placeholder is recorded honestly if token is absent |
| Initial results | Initial bbox search returns listings and renders pins/cards |
| Pan/zoom | Camera movement shows Search this area when appropriate |
| Search this area | Button commits current bbox and refreshes pins/cards |
| Pin/card sync | Pin selection and card selection stay synchronized |
| Detail handoff | Listing detail opens from selected card/pin path |
| Filters | Filter sheet applies existing API params |
| Sort | `newest`, `price-asc`, `price-desc`, `dom` work |
| Signed-out favorite prompt | Heart tap prompts login, no mutation |
| Signed-in favorite toggle | Toggle persists if credentials are available |
| Non-scope side effects | No TTS, geofence, Android Auto, GPS, or navigation behavior is invoked |
| Stability | No fatal Flutter red screen during smoke path |

QA reports must distinguish:

- automated validation;
- Android emulator runtime validation;
- physical device validation, if any;
- anything not validated.

---

## 15. Stop Conditions

Stop and report before proceeding if:

- SDK cannot pass validation.
- Token/secrets policy is ambiguous.
- Any implementation tries to absorb geofence, TTS, Android Auto, location, or navigation work.
- API search/favorites contract is ambiguous.
- Tenant/auth behavior is ambiguous.
- CI/mobile validation is unavailable.
- SDK setup creates unexpected generated/native files.
- A docs-only PR touches forbidden files.
- Source/package/lockfile/test/CI files appear in this contract PR.
- `git diff --check` fails after mechanical Markdown cleanup.
