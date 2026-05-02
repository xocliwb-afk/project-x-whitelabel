# Project X White Label — Mobile Architecture

**Last Updated:** 2026-05-02

---

## 1. Current State

`apps/mobile` is a real Flutter client, not a decorative skeleton. It includes:

- Supabase initialization and auth state management
- Riverpod providers for auth, API transport, brand config, search, listing detail, and tour draft/current-tour state
- Dio API client with tenant and auth handling
- GoRouter route guards with public `/search`, `/listing/:id`, and `/tour`
- Brand config fetch on startup and ThemeData generation from tenant brand config
- Dart models for listings, tours, brand config, leads, narration payloads, and auth user data
- A focused Flutter test suite under `apps/mobile/test`

Epic 15 completed the first real mobile product surfaces:

- **Search:** public, list-first search UI backed by `listingSearchControllerProvider`
- **Listing Detail:** public PDP-style detail UI backed by `ListingDetailController`, with Search preview fallback through `GoRouter.extra`
- **Tour:** public local draft planner/current-tour UI backed by `tourDraftControllerProvider`; persisted tour actions remain auth-gated

## 2. Flutter's Role

Flutter is the primary mobile client. The mobile app:

1. Consumes the same BFF API as the web client (`apps/api`)
2. Consumes runtime tenant brand config for theming and identity
3. Uses Dart model classes that mirror API response contracts
4. Provides public Search and Listing Detail surfaces
5. Provides a local Tour draft/current-tour planner with authenticated persistence

Mobile does not directly import TypeScript shared types. Contract alignment is enforced through API response shape, Dart models, and tests.

## 3. API Usage

Mobile API calls go through `apps/mobile/lib/services/api_client.dart` and repository/controller/provider layers. Widgets do not call the API client directly.

Current Epic 15 mobile surfaces use:

| Surface | API dependency | Auth requirement |
|---------|----------------|------------------|
| Search | `GET /api/listings` | Public |
| Listing Detail | `GET /api/listings/:id` | Public |
| Brand bootstrap | `GET /api/brand` | Public tenant-aware request |
| Local Tour draft | None | Public local state |
| Persisted Tour save/load/update/delete | `/api/tours*` | Auth + tenant |

Lead capture, favorites, saved searches, route calculation, geofencing, TTS playback, and Android Auto are outside Epic 15 screen scope.

## 4. State Management

The app uses Riverpod.

Current state boundaries:

- `authProvider`: Supabase/local app user lifecycle and provisioning status
- `brandConfigProvider`: runtime tenant brand config
- `listingSearchControllerProvider`: query, results, pagination, loading/error state
- `listingDetailControllerProvider`: listing detail fetch, preview fallback, retry/error state
- `tourDraftControllerProvider`: local draft stops, reorder/remove, schedule metadata, auth-gated persistence, current-tour state, logout/user-change reset

UI should continue to follow:

`Widget -> controller/provider -> repository -> ApiClient`

## 5. Routing Contract

The current mobile route contract is:

| Route | Access | Notes |
|-------|--------|-------|
| `/login` | Public | Redirects authenticated users to `/search` |
| `/register` | Public | Redirects authenticated users to `/search` |
| `/search` | Public | List-first mobile search |
| `/listing/:id` | Public | Detail fetch by ID; accepts optional `Listing` preview via `state.extra` |
| `/tour` | Public local draft | Persisted actions are still auth-gated in the controller |

Routes outside the public contract redirect signed-out users to `/login`.

## 6. Testing

Mobile tests now cover:

- Routing public-vs-protected behavior
- Search initial shell, loading, empty, error/retry, navigation, and add-to-tour gating
- Listing Detail preview fallback, full detail render, fetch failures with/without preview, and add-to-tour gating
- Tour draft controller local state, auth-gated persistence, failure preservation, and current tour state
- Tour screen empty state, stops, remove/reorder, signed-out auth gate, signed-in save, failed save preservation, and `tourEngine=false`

Expected validation for mobile-affecting work:

```bash
cd apps/mobile
flutter pub get
flutter analyze
flutter test
```

Repo-level validation should also include the API and web gates when closing cross-surface epics:

```bash
pnpm --filter @project-x/api test
pnpm --filter web build
pnpm --filter web lint
```

## 7. Deferred Mobile Work

The following remain deferred beyond Epic 15:

- Embedded map SDK work and map/list parity with web
- Route polyline rendering
- Navigation handoff/deep links to external maps
- Native geofencing
- TTS/narration playback
- Android Auto production implementation
- Favorites, saved searches, and lead capture on the new mobile Search/Listing Detail/Tour screens
- Share/export
- Multi-tour archive/history UX
- Broader platform packaging, physical-device QA, and store/deployment work

Existing narration/proximity/Android Auto service files are architecture stubs or interfaces only; they are not production platform integrations.
