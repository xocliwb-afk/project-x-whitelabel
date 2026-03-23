# Epics 11–18: Consolidated Implementation Plan

## White-Label Real Estate SaaS Platform — Full Product Build

**Date:** 2026-03-23  
**Status:** Approved — ready for implementation  
**Audience:** AI coding agent (Claude Code) + human reviewer  
**Sources:** Cross-referenced from Claude (architecture), ChatGPT Pro (patterns/gotchas), Gemini (specification), plus 5 independent code audits

---

## Current State (Post-Epic 10)

- **13 PRs merged**, 83 API tests passing, all gates green
- **apps/web:** Next.js 14, Tailwind, Zustand, Mapbox — working search with map+list, PDP, filters, AI search
- **apps/api:** Express/TypeScript BFF — SimplyRETS adapter, HubSpot leads (retry+classification), tour CRUD, narration service, compliance enforcement
- **apps/mobile:** Flutter — Riverpod, GoRouter, Dio, 24 Dart files, brand config → ThemeData. Placeholder screens only.
- **packages/shared-types:** 13+ canonical TS interfaces exported
- **config/brand.json:** Single-file brand config (build-time on web, runtime on mobile via GET /api/brand)
- **No database. No auth. No user accounts. No saved searches. Single-tenant build-time branding.**

---

## Foundational Architectural Decisions

These 7 decisions are made once and referenced throughout all epics.

### Decision A — Database: Supabase (Hosted PostgreSQL + Auth + Storage)

**Recommendation: Supabase**

The codebase needs PostgreSQL, authentication across web + mobile + API, and file storage for brand assets. Supabase provides all three from a single vendor. Prisma sits on top as the ORM for type-safe queries and migration management.

Setup:
- Supabase project → PostgreSQL connection string
- Prisma as ORM (NOT Supabase JS client for data access — Prisma gives type safety)
- Supabase Auth for authentication (JWT validation in Express, cookie sessions in Next.js, `supabase_flutter` on mobile)
- Supabase Storage for brand asset uploads (logos, favicons)
- New monorepo package: `packages/database` housing `schema.prisma`, migrations, singleton Prisma client

### Decision B — Auth: Supabase Auth

**Recommendation: Supabase Auth**

Auth flow:
- **Web:** `@supabase/ssr` handles cookie-based sessions in Next.js middleware + server components
- **API:** Express middleware validates `Authorization: Bearer <jwt>` using Supabase JWT secret
- **Mobile:** `supabase_flutter` handles token storage, refresh, and provides JWT for API calls

### Decision C — Multi-Tenancy: Subdomain Resolution + Tenant Column

**Recommendation: Subdomain resolution + `tenant_id` column on all tenant-scoped tables**

- **Next.js middleware:** Extracts subdomain from `Host` header → looks up tenant (cached) → injects `x-tenant-id` header
- **API:** Express middleware reads `x-tenant-id` header. All DB queries filter by `tenant_id`.
- **Mobile:** Brand config fetch at launch includes `tenant_id`; all API requests include `x-tenant-id` header
- **Database:** Shared-database, shared-schema. `tenant_id UUID` column on Brand, User, SavedSearch, Favorite, Tour tables.
- **Fallback:** Unrecognized subdomains → 404 page

### Decision D — Admin UI: Route Group in Existing Web App

**Recommendation: `apps/web/app/(admin)/admin/...` behind auth + role check**

Route group shares Tailwind config, component library, and auth infrastructure. Protected by middleware checking `role = 'ADMIN'` on JWT.

### Decision E — Flutter Map: `mapbox_maps_flutter`

**Recommendation: Official Mapbox Maps SDK for Flutter**

Same renderer as web (Mapbox GL), visual parity, same token. Supports annotations, camera animations, clustering.

### Decision F — Android Auto: PlaceListNavigationTemplate + PaneTemplate

**Recommendation: PlaceListNavigationTemplate for tour stop list, PaneTemplate for stop detail**

NavigationTemplate requires turn-by-turn metadata the app doesn't produce. Minimum viable: show stops on map, tap for details, launch Google Maps for navigation.

Data flow: Flutter → JSON file in internal storage → Kotlin CarAppService reads file (Auto runs in separate process).

### Decision G — Deployment

- **Web:** Vercel (edge middleware for tenant resolution, preview deployments)
- **API:** Railway (Express app, auto-deploy from GitHub)
- **Database:** Supabase managed PostgreSQL
- **Mobile builds:** Codemagic (Flutter-native CI/CD)

---

## Execution Order

```
11 → 13 → 12 → 14 → 15 → 16 → 17 → 18
```

13 before 12 because tenant context affects how saved searches and favorites are scoped.

### Dependency Graph

```
Epic 11 (Auth + DB)
  ├── Epic 13 (Multi-Tenant Branding)
  │     └── Epic 14 (Admin UI)
  ├── Epic 12 (Saved Searches + Favorites)
  └── Epic 15 (Flutter Screens)
        └── Epic 16 (Geofencing + TTS)
              └── Epic 17 (Android Auto)

Epic 18 (Deployment) depends on ALL of 11–17
```

### Parallelization (if multiple developers)
- Epics 12, 13, and 15 can all start once Epic 11 is done
- Epic 14 can start once Epic 13 is done (parallel with 15/16)

---

## Package Structure After All Epics

```
├── apps/
│   ├── web/                    # Next.js 14 — consumer + admin UI
│   ├── api/                    # Express/TypeScript BFF
│   └── mobile/                 # Flutter app (real screens + native Android)
├── packages/
│   ├── shared-types/           # Canonical TypeScript interfaces
│   └── database/               # NEW: Prisma schema, client, migrations
├── config/
│   └── brand.json              # DEPRECATED by Epic 13 (DB-driven)
```

---

## Epic 11 — User Accounts + Auth + Database

### Goal
Stand up PostgreSQL with Prisma, integrate Supabase Auth across web, API, and mobile, implement user registration/login/profile, and migrate tour store from in-memory to database.

### Prerequisites
None — this is the foundation epic. **Requires a Supabase project to be created first.**

### Database Changes

New package `packages/database/` with `schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Tenant {
  id        String   @id @default(uuid()) @db.Uuid
  slug      String   @unique
  name      String
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  users   User[]
  brands  Brand[]
  tours   Tour[]

  @@map("tenants")
}

model User {
  id            String   @id @default(uuid()) @db.Uuid
  supabaseId    String   @unique @map("supabase_id")
  tenantId      String   @map("tenant_id") @db.Uuid
  email         String
  displayName   String?  @map("display_name")
  phone         String?
  role          Role     @default(CONSUMER)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  tenant        Tenant          @relation(fields: [tenantId], references: [id])
  savedSearches SavedSearch[]
  favorites     Favorite[]
  tours         Tour[]

  @@unique([tenantId, email])
  @@index([tenantId])
  @@index([supabaseId])
  @@map("users")
}

enum Role {
  CONSUMER
  AGENT
  ADMIN
}
```

### Shared-Types Changes

New file `packages/shared-types/src/auth.ts`:

```typescript
export interface AuthUser {
  id: string;
  supabaseId: string;
  tenantId: string;
  email: string;
  displayName: string | null;
  phone: string | null;
  role: 'CONSUMER' | 'AGENT' | 'ADMIN';
  createdAt: string;
}

export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest { email: string; password: string; displayName?: string; phone?: string; }
export interface AuthResponse { user: AuthUser; accessToken: string; refreshToken: string; }
export interface UpdateProfileRequest { displayName?: string; phone?: string; }
```

### API Changes

| File | Description |
|------|-------------|
| `apps/api/src/middleware/auth.ts` | Validates Bearer JWT via Supabase JWT secret, attaches `req.user` |
| `apps/api/src/middleware/tenant.ts` | Reads `x-tenant-id` header, validates tenant, attaches `req.tenantId` |
| `apps/api/src/routes/auth.ts` | Auth endpoints (see below) |
| `apps/api/src/services/user.service.ts` | `findBySupabaseId`, `create`, `update` |

**New endpoints:**

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | /api/auth/register | RegisterRequest | AuthResponse |
| POST | /api/auth/login | LoginRequest | AuthResponse |
| POST | /api/auth/logout | — | `{ success: true }` |
| GET | /api/auth/me | — | AuthUser |
| PATCH | /api/auth/me | UpdateProfileRequest | AuthUser |
| POST | /api/auth/refresh | `{ refreshToken }` | `{ accessToken, refreshToken }` |

### Web Changes

| File | Description |
|------|-------------|
| `apps/web/app/(auth)/login/page.tsx` | Login form (email + password, Google OAuth) |
| `apps/web/app/(auth)/register/page.tsx` | Registration form |
| `apps/web/app/(auth)/layout.tsx` | Centered card layout for auth pages |
| `apps/web/lib/supabase/client.ts` | Browser Supabase client (singleton) |
| `apps/web/lib/supabase/server.ts` | Server-side Supabase client (cookies) |
| `apps/web/lib/supabase/middleware.ts` | Session refresh in Next.js middleware |
| `apps/web/stores/auth-store.ts` | Zustand: `{ user, isLoading, login, register, logout }` |
| `apps/web/components/auth/auth-guard.tsx` | Wraps protected routes, redirects to `/login` |
| `apps/web/components/auth/user-menu.tsx` | Avatar dropdown (profile, logout) |

### Mobile Changes (Dart only)

| File | Description |
|------|-------------|
| `apps/mobile/lib/services/auth_service.dart` | Wraps `supabase_flutter` auth methods |
| `apps/mobile/lib/providers/auth_provider.dart` | Riverpod StateNotifierProvider for auth |
| `apps/mobile/lib/screens/auth/login_screen.dart` | Email/password login |
| `apps/mobile/lib/screens/auth/register_screen.dart` | Registration |
| `apps/mobile/lib/screens/profile/profile_screen.dart` | View/edit profile |
| Modify `main.dart` | Initialize `Supabase.initialize()` before `runApp()` |
| Modify `api_client.dart` | Add auth token interceptor to Dio |

### Dependencies

- **npm:** `prisma` (dev), `@prisma/client`, `@supabase/supabase-js`, `@supabase/ssr`
- **pub:** `supabase_flutter: ^2.0.0`

### Acceptance Criteria

1. `npx prisma migrate deploy` creates `tenants` and `users` tables in Supabase PostgreSQL
2. A new user can register via `POST /api/auth/register` and receives a valid JWT
3. The JWT can be used to access `GET /api/auth/me` and returns the correct user
4. Web login page authenticates and redirects to search with persistent session (survives refresh)
5. Flutter app can log in and include auth token in subsequent API calls
6. Unauthenticated requests to protected endpoints return 401
7. User with `role: CONSUMER` cannot access ADMIN-only endpoints (403)
8. `POST /api/auth/refresh` returns a new access token given a valid refresh token

### Key Risks

| Decision | Recommendation | Reasoning |
|----------|----------------|-----------|
| Password vs passwordless | Password + Google OAuth | Real estate users expect password login |
| User creation timing | On register (not first API call) | Avoids race conditions |
| Session storage (web) | Cookie via `@supabase/ssr` | Secure, SSR-compatible, no XSS risk |
| Prisma location | `packages/database` | Shared across API and future workers |
| Tour migration | Same epic — swap in-memory Map for Prisma Tour model | API contract unchanged, storage backend changes |

---

## Epic 12 — Saved Searches + Favorites

### Goal
Allow authenticated users to save search filters and favorite listings, with persistence across web + mobile.

### Prerequisites
Epic 11 (requires auth + database)

### Database Changes (add to schema.prisma)

```prisma
model SavedSearch {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  tenantId  String   @map("tenant_id") @db.Uuid
  name      String
  filters   Json
  notifyNew Boolean  @default(false) @map("notify_new")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([tenantId])
  @@map("saved_searches")
}

model Favorite {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  tenantId  String   @map("tenant_id") @db.Uuid
  listingId String   @map("listing_id")
  createdAt DateTime @default(now()) @map("created_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, listingId])
  @@index([userId])
  @@index([tenantId])
  @@map("favorites")
}
```

### API Endpoints

**Saved Searches:**

| Method | Path | Response |
|--------|------|----------|
| GET | /api/saved-searches | SavedSearchRecord[] |
| POST | /api/saved-searches | SavedSearchRecord |
| PATCH | /api/saved-searches/:id | SavedSearchRecord |
| DELETE | /api/saved-searches/:id | `{ success: true }` |
| GET | /api/saved-searches/:id/run | NormalizedListing[] |

**Favorites:**

| Method | Path | Response |
|--------|------|----------|
| GET | /api/favorites | FavoriteWithListing[] |
| POST | /api/favorites | FavoriteRecord |
| DELETE | /api/favorites/:listingId | `{ success: true }` |
| GET | /api/favorites/ids | string[] |

### Web Changes

- `apps/web/app/(main)/saved-searches/page.tsx` — list with run/edit/delete
- `apps/web/app/(main)/favorites/page.tsx` — grid of favorited listings
- `apps/web/components/search/save-search-modal.tsx` — modal to name and save filters
- `apps/web/components/listing/favorite-button.tsx` — heart icon toggle (optimistic UI)
- `apps/web/stores/favorites-store.ts` — `{ favoriteIds: Set<string>, toggle, isFavorited }`
- `apps/web/stores/saved-searches-store.ts` — `{ searches, create, update, delete, run }`

### Mobile Changes

- `apps/mobile/lib/services/saved_search_service.dart`
- `apps/mobile/lib/services/favorite_service.dart`
- `apps/mobile/lib/providers/saved_searches_provider.dart`
- `apps/mobile/lib/providers/favorites_provider.dart`
- `apps/mobile/lib/screens/saved_searches/saved_searches_screen.dart`
- `apps/mobile/lib/screens/favorites/favorites_screen.dart`
- `apps/mobile/lib/widgets/favorite_button.dart`

### Acceptance Criteria

1. Authenticated user can save current search filters with a name
2. `GET /api/saved-searches` returns only the requesting user's searches
3. `GET /api/saved-searches/:id/run` executes saved filters against listing provider
4. Heart icon toggles favorite (optimistic UI, rolls back on failure)
5. Favorites hydrated with full NormalizedListing data on read
6. Duplicate favorites are idempotent or return 409
7. Unauthenticated users see "Log in to save" prompt
8. Data persists across sessions (log out → log in → data present)

### Key Decisions

| Decision | Recommendation | Reasoning |
|----------|----------------|-----------|
| Favorite hydration | Hydrate on read (not snapshot) | Listings change (price drops) |
| Favorite ID cache | Fetch IDs on auth, cache in Zustand/Riverpod Set | Instant `isFavorited()` without round-trip |
| Saved search format | JSON blob (`filters Json`) | Filters evolve; JSON avoids migrations |

---

## Epic 13 — Multi-Tenant Runtime Brand Switching

### Goal
Replace static `config/brand.json` with database-driven, runtime-resolved multi-tenant branding.

### Prerequisites
Epic 11 (database must exist)

### Database Changes (add to schema.prisma)

```prisma
model Brand {
  id         String   @id @default(uuid()) @db.Uuid
  tenantId   String   @unique @map("tenant_id") @db.Uuid
  config     Json
  logoUrl    String?  @map("logo_url")
  faviconUrl String?  @map("favicon_url")
  active     Boolean  @default(true)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")
  tenant     Tenant   @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
  @@map("brands")
}
```

### API Changes

- Modify `GET /api/brand`: reads `req.tenantId` → queries Brand table → returns `TenantBrandConfig`
- Falls back to default brand if no DB record (migration path)
- Response cached: `Cache-Control: public, max-age=300` + `ETag`
- New service: `apps/api/src/services/brand.service.ts` with in-memory LRU cache (5 min TTL)

### Web Changes

- `apps/web/middleware.ts` — extract subdomain → resolve tenant → set `x-tenant-id`
- `apps/web/lib/tenant/resolve.ts` — `resolveTenant(hostname)`
- `apps/web/lib/tenant/brand-context.tsx` — React context for TenantBrandConfig
- `apps/web/lib/tenant/use-brand.ts` — `useBrand()` hook
- `apps/web/app/layout.tsx` — wrap with BrandProvider, inject CSS variables
- `apps/web/tailwind.config.ts` — replace static colors with CSS variable refs: `primary: 'var(--brand-primary)'`
- Remove direct imports of `config/brand.json`
- Seed script: `packages/database/prisma/seed.ts` reads brand.json → creates default Tenant + Brand

### Mobile Changes

- Modify `brand_service.dart` — add `x-tenant-id` header from app config
- Add `apps/mobile/lib/config/app_config.dart` — `tenantId` from build arg or runtime
- For now: tenant ID at build time via `--dart-define=TENANT_ID=xxx`

### Acceptance Criteria

1. Two tenants exist with different brand configs (different colors, logos)
2. `acme.localhost:3000` shows Acme branding; `luxe.localhost:3000` shows Luxe branding
3. `GET /api/brand` returns correct brand per tenant
4. Tailwind classes resolve to tenant colors at runtime (not build-time)
5. Color change in DB reflects on site within 5 minutes (cache TTL)
6. Flutter renders correct brand when built with specific TENANT_ID
7. Unrecognized subdomain → 404

### Key Decisions

| Decision | Recommendation | Reasoning |
|----------|----------------|-----------|
| CSS injection | Server-side in `<html style>` | No flash of wrong colors |
| Brand caching | In-memory LRU (5 min TTL) | Small tenant count, no Redis needed yet |
| Tailwind colors | CSS variables in tailwind.config.ts | Single build serves all tenants |
| Static brand.json | Keep as fallback during migration, delete after Epic 14 | Smooth transition |

---

## Epic 14 — Brand Config Admin UI

### Goal
Build a protected admin interface for managing brand configs — colors, logos, typography, feature flags — with live preview.

### Prerequisites
Epic 11 (auth/roles), Epic 13 (Brand table + runtime system)

### Database Changes

```prisma
model AuditLog {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @map("tenant_id") @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  action    String
  payload   Json?
  createdAt DateTime @default(now()) @map("created_at")

  @@index([tenantId])
  @@index([userId])
  @@map("audit_logs")
}
```

### API Endpoints (all require ADMIN role)

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | /api/admin/brand | — | TenantBrandConfig |
| PUT | /api/admin/brand | BrandFormData | TenantBrandConfig |
| PATCH | /api/admin/brand | Partial\<BrandFormData\> | TenantBrandConfig |
| POST | /api/admin/brand/logo | multipart file | `{ url: string }` |
| POST | /api/admin/brand/favicon | multipart file | `{ url: string }` |
| POST | /api/admin/brand/validate | BrandFormData | `{ valid, errors[] }` |

Upload service: Supabase Storage bucket `brand-assets`, validates type (png/jpg/svg/ico) and size (max 2MB).

### Web Changes

- `apps/web/app/(admin)/admin/layout.tsx` — admin shell with sidebar, role guard
- `apps/web/app/(admin)/admin/page.tsx` — dashboard
- `apps/web/app/(admin)/admin/brand/page.tsx` — brand editor
- `apps/web/components/admin/brand-form.tsx` — color pickers, font selectors, toggles
- `apps/web/components/admin/brand-preview.tsx` — live preview with current draft colors
- `apps/web/components/admin/logo-uploader.tsx` — drag-and-drop with preview
- `apps/web/stores/admin-brand-store.ts` — draft, dirty check, save

### Dependencies
- `multer` (Express file upload)
- `react-colorful` (lightweight color picker, ~2KB)

### Acceptance Criteria

1. Only ADMIN users can access `/admin` routes
2. Brand form displays current config pre-filled
3. Changing primary color updates live preview (client-side, not saved yet)
4. Save persists to DB; consumer site reflects within 5 minutes
5. Logo upload (PNG < 2MB) replaces header logo
6. Validation errors shown for invalid hex codes / missing fields
7. Audit log entry for each brand update

---

## Epic 15 — Real Flutter Screens (Search, Detail, Tour)

### Goal
Replace all placeholder screens with fully functional search (map + list), listing detail (PDP), and active tour screens.

### Prerequisites
Epic 11 (auth for favorites/tour). Can start without Epic 12 by feature-flagging favorites.

### New Screens

| File | Description |
|------|-------------|
| `screens/search/search_screen.dart` | Split view: Mapbox map (top) + scrollable listing list (bottom) + filter bar |
| `screens/search/filter_sheet.dart` | Bottom sheet: price slider, beds, baths, sqft, property type |
| `screens/listing/listing_detail_screen.dart` | Photo gallery (PageView), price, facts grid, description, map, contact CTA |
| `screens/listing/photo_gallery.dart` | Full-screen swipeable photo viewer |
| `screens/tour/tour_screen.dart` | Current stop card, next/prev, map with polyline, narration play/pause |
| `screens/tour/tour_stop_card.dart` | Address, listing summary, narration text, Navigate button |

### New Widgets

| File | Description |
|------|-------------|
| `widgets/map/listing_map.dart` | Mapbox map with marker clusters, camera animation, tap-to-select |
| `widgets/map/marker_builder.dart` | Price pill markers matching web |
| `widgets/listing/listing_card.dart` | Photo, price, address, beds/baths/sqft, favorite button |
| `widgets/search/filter_chip_bar.dart` | Horizontal scrolling active filter chips |
| `widgets/tour/narration_player.dart` | Play/pause, progress indicator |

### New Providers (Riverpod)

- `search_provider.dart` — SearchFilters + List\<NormalizedListing\> + loading + pagination
- `listing_detail_provider.dart` — FutureProvider.family keyed by listing ID
- `active_tour_provider.dart` — current tour, stop index, narration state

### Dependencies

- `mapbox_maps_flutter: ^2.0.0`
- `flutter_tts: ^4.0.0`
- `cached_network_image: ^3.3.0`
- `url_launcher: ^6.2.0`
- `shimmer: ^3.0.0`

### Acceptance Criteria

1. Search screen shows Mapbox map with markers + scrollable list
2. Tapping marker highlights corresponding card (and vice versa)
3. Applying filters updates both map and list
4. Detail screen shows all NormalizedListing fields: photos, price, beds, baths, sqft, description
5. Photo swiping is smooth (cached images, shimmer placeholders)
6. Tour screen shows stops with map polyline
7. Narration player speaks via TTS with play/pause
8. "Navigate" launches Google Maps with stop coordinates

---

## Epic 16 — Native Android Geofencing + TTS

### Goal
Background geofencing on Android that triggers narration via TTS when approaching tour stops.

### Prerequisites
Epic 15 (real tour screen must exist)

### Dart Layer

- `services/geofence_service.dart` — platform channel to native: `registerGeofences()`, `clearGeofences()`, `onProximityEvent` stream
- `services/narration_service.dart` — TTS queue: `speak()`, `stop()`, `setLanguage()`
- `providers/geofence_provider.dart` — listens to tour state, registers/clears geofences, triggers narration

### Kotlin Native Layer

| File | Description |
|------|-------------|
| `GeofencePlugin.kt` | MethodChannel plugin: receives registerGeofences, creates GeofencingRequest, registers with GeofencingClient |
| `GeofenceBroadcastReceiver.kt` | Receives geofence intents, sends ProximityEvent to Dart via EventChannel |
| `TtsService.kt` | Foreground service: Android TextToSpeech, persistent notification, speaks on geofence enter |

### AndroidManifest.xml Additions

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<service android:name=".TtsService" android:foregroundServiceType="location" android:exported="false" />
<receiver android:name=".GeofenceBroadcastReceiver" android:exported="false">
    <intent-filter><action android:name="com.app.GEOFENCE_EVENT" /></intent-filter>
</receiver>
```

### Dependencies
- **pub:** `permission_handler: ^11.0.0`, `flutter_local_notifications: ^17.0.0`
- **gradle:** `com.google.android.gms:play-services-location:21.1.0`

### Acceptance Criteria

1. Tour start registers geofences for all stops (200m radius)
2. Approaching a stop triggers ProximityEvent with `triggerType: 'ENTER'`
3. Enter event triggers TTS narration
4. Works in background (minimize app → drive toward stop → narration plays)
5. Persistent notification during active tour
6. Tour end clears geofences and stops foreground service
7. Background location permission requested with rationale dialog

---

## Epic 17 — Native Android Auto CarAppService

### Goal
Android Auto integration showing tour stops on car head unit with details and navigation launch.

### Prerequisites
Epic 15 (tour must be functional), Epic 16 (active-tour lifecycle)

### Data Bridge: Flutter → Android Auto

1. Tour start → Flutter writes `active_tour.json` to internal storage via platform channel
2. Sets `SharedPreferences` flag `has_active_tour: true`
3. CarAppService reads file on session start + on broadcast when data changes
4. Flutter sends local broadcast on tour data updates

### Kotlin Files

| File | Description |
|------|-------------|
| `auto/TourCarAppService.kt` | Extends CarAppService, returns TourListScreen |
| `auto/TourListScreen.kt` | PlaceListNavigationTemplate: stop list + map markers, tap → detail |
| `auto/TourStopDetailScreen.kt` | PaneTemplate: address, price, narration, "Navigate" button |
| `auto/TourAutoDataReader.kt` | Reads + parses `active_tour.json` |
| `auto/models/AutoTourData.kt` | Kotlin data class |
| `auto/models/AutoTourStop.kt` | Kotlin data class |

### AndroidManifest.xml Additions

```xml
<service android:name=".auto.TourCarAppService" android:exported="true">
    <intent-filter>
        <action android:name="androidx.car.app.CarAppService" />
        <category android:name="androidx.car.app.category.NAVIGATION" />
    </intent-filter>
</service>
<meta-data android:name="com.google.android.gms.car.application" android:resource="@xml/automotive_app_desc" />
```

### Dependencies
- **gradle:** `androidx.car.app:app:1.4.0`, `androidx.car.app:app-projected:1.4.0`, `com.google.code.gson:gson:2.10.1`

### Acceptance Criteria

1. Phone connected to Auto/DHU shows tour app in launcher
2. Active tour shows PlaceListNavigationTemplate with all stops
3. Tapping stop shows PaneTemplate with address, price, narration
4. "Navigate" launches Google Maps to stop coordinates
5. No active tour → "No active tour" message
6. Starting tour in Flutter updates Auto screen within 5 seconds
7. Passes DHU testing without template violations

---

## Epic 18 — Deployment + Device Testing

### Goal
Deploy all services to production, configure CI/CD, verify end-to-end on physical devices and Android Auto.

### Prerequisites
All Epics 11–17 complete.

### Infrastructure

| Service | Platform | Config |
|---------|----------|--------|
| Web | Vercel | Auto-deploy from main, preview on PRs, wildcard SSL |
| API | Railway | Express container, auto-deploy, env vars |
| Database | Supabase | Managed PostgreSQL, connection pooling via pgBouncer |
| Mobile CI | Codemagic | Android APK/AAB + iOS IPA builds |

### Environment Variables

**API:**
```
DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET, PORT, NODE_ENV
```

**Web:**
```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_MAPBOX_TOKEN
```

**Mobile (build args):**
```
SUPABASE_URL, SUPABASE_ANON_KEY, API_URL, MAPBOX_TOKEN, TENANT_ID
```

### Acceptance Criteria

1. Web deploys to Vercel via `git push main`; previews work on PRs
2. API deploys to Railway; env vars configured
3. `prisma migrate deploy` succeeds against production Supabase
4. Multi-tenant branding works (two subdomains → different brands)
5. Flutter builds and installs on physical Android device
6. E2E: register on web → save search → open mobile → see same search
7. E2E: start tour on mobile → approach stop → geofence → TTS narration
8. Android Auto: connect to car/DHU → see stops → launch navigation

---

## Migration Strategy: Static → Dynamic Brand Config

1. **Epic 11:** Create `tenants` table. Seed with one default tenant.
2. **Epic 13:** Create `brands` table. Seed reads `config/brand.json` → inserts as default tenant's brand. `GET /api/brand` reads DB.
3. **Epic 14:** Admin UI modifies brand. `config/brand.json` kept as fallback.
4. **Post-Epic 14:** Delete `config/brand.json`. All branding is DB-driven.

---

## Complete Prisma Schema (After All Epics)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  CONSUMER
  AGENT
  ADMIN
}

model Tenant {
  id        String   @id @default(uuid()) @db.Uuid
  slug      String   @unique
  name      String
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  users     User[]
  brands    Brand[]
  tours     Tour[]
  @@map("tenants")
}

model User {
  id            String   @id @default(uuid()) @db.Uuid
  supabaseId    String   @unique @map("supabase_id")
  tenantId      String   @map("tenant_id") @db.Uuid
  email         String
  displayName   String?  @map("display_name")
  phone         String?
  role          Role     @default(CONSUMER)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  tenant        Tenant          @relation(fields: [tenantId], references: [id])
  savedSearches SavedSearch[]
  favorites     Favorite[]
  tours         Tour[]
  @@unique([tenantId, email])
  @@index([tenantId])
  @@index([supabaseId])
  @@map("users")
}

model Brand {
  id         String   @id @default(uuid()) @db.Uuid
  tenantId   String   @unique @map("tenant_id") @db.Uuid
  config     Json
  logoUrl    String?  @map("logo_url")
  faviconUrl String?  @map("favicon_url")
  active     Boolean  @default(true)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")
  tenant     Tenant   @relation(fields: [tenantId], references: [id])
  @@index([tenantId])
  @@map("brands")
}

model SavedSearch {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  tenantId  String   @map("tenant_id") @db.Uuid
  name      String
  filters   Json
  notifyNew Boolean  @default(false) @map("notify_new")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@index([tenantId])
  @@map("saved_searches")
}

model Favorite {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  tenantId  String   @map("tenant_id") @db.Uuid
  listingId String   @map("listing_id")
  createdAt DateTime @default(now()) @map("created_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, listingId])
  @@index([userId])
  @@index([tenantId])
  @@map("favorites")
}

model Tour {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  tenantId    String   @map("tenant_id") @db.Uuid
  name        String
  status      String   @default("draft")
  stops       Json
  route       Json?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  @@index([userId])
  @@index([tenantId])
  @@map("tours")
}

model AuditLog {
  id        String   @id @default(uuid()) @db.Uuid
  tenantId  String   @map("tenant_id") @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  action    String
  payload   Json?
  createdAt DateTime @default(now()) @map("created_at")
  @@index([tenantId])
  @@index([userId])
  @@map("audit_logs")
}
```

---

## Time Estimates (Solo Developer with AI Coding Assistance)

| Epic | Scope | Estimate |
|------|-------|----------|
| 11 | Auth + DB + migration | 10–15 days |
| 13 | Multi-tenant branding | 5–8 days |
| 12 | Saved searches + favorites | 4–6 days |
| 14 | Admin UI | 4–7 days |
| 15 | Flutter screens | 10–15 days |
| 16 | Geofencing + TTS | 5–8 days |
| 17 | Android Auto | 7–12 days |
| 18 | Deployment + testing | 2–4 days |
| **Total** | | **47–75 days** |

---

## Milestone: "Working in My Car"

The minimum path to testing narration in a real car:

1. Epic 11 — database + auth (unlocks everything)
2. Epic 15 — real Flutter screens (need working tour UI)
3. Epic 16 — native geofencing + TTS (narration plays on approach)
4. Epic 17 — Android Auto CarAppService (tour on head unit)
5. Deploy API to public URL, build APK, install on phone
6. Drive to listing addresses → narration triggers → Auto displays stops

Multi-tenant, admin UI, saved searches, and marketing can come before or after the car test.
