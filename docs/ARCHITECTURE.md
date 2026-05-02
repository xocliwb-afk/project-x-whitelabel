# Architecture Overview

## System State

Project X is a multi-tenant white-label real estate search monorepo. The current codebase includes a working web product, an Express BFF/API, a Flutter mobile client, Prisma-backed persisted user data, Supabase authentication, and runtime DB-driven tenant branding.

Search remains the product center. Marketing pages still exist, but they are not the architectural source of truth for the tenant-aware product surfaces.

## Stack

- **Web:** Next.js 14 App Router, Tailwind CSS, Zustand, Mapbox, Supabase SSR helpers
- **API:** Express + TypeScript BFF, Prisma, `jose` for JWT verification, Zod for validation
- **Mobile:** Flutter, Riverpod, Dio, GoRouter, `supabase_flutter`
- **Database:** Prisma ORM + PostgreSQL (`packages/database/prisma/schema.prisma`)
- **Auth:** Supabase Auth across web, API, and mobile
- **Monorepo:** pnpm workspaces + Turborepo

## Repository Layout

- `apps/web`: Next.js web app, product UI, auth flows, SSR brand loading, and static marketing rewrites
- `apps/api`: BFF/API for listings, geo, leads, auth, brand config, favorites, saved searches, and tours
- `apps/mobile`: Flutter mobile client with auth/bootstrap/theme plumbing, list-first Search, Listing Detail, and Tour planner/current-tour screens
- `packages/shared-types`: canonical TypeScript contracts shared by web and API
- `packages/database`: Prisma schema, generated client, and seed logic
- `config/brand.json`: legacy/static brand source still used for seeding, local fallback, and marketing rewrites

## Runtime Architecture

### Listings and Search

The clients do not talk to MLS vendors directly. Search and listing detail flows go through the API, which uses the `ListingProvider` abstraction and normalizes listing data before returning it to clients.

### Leads

Lead submission flows through the API and the lead provider layer. The current implementation includes rate limiting, captcha verification, normalization, and provider-based submission/error classification.

### Tours and Other Persisted User Data

Tours, favorites, and saved searches are stored in PostgreSQL and scoped by tenant and user. Authenticated persisted routes use explicit tenant resolution and fail closed when required tenant context is missing.

## Multi-Tenancy

### Data Model

The current Prisma schema uses a shared-database, shared-schema model with `tenant_id` on tenant-scoped tables:

- `User`
- `Brand`
- `SavedSearch`
- `Favorite`
- `Tour`
- `AuditLog`

`Tenant` is the top-level ownership record, and `TourStop` hangs off `Tour`.

### Tenant Resolution by Surface

- **Web:** authenticated API calls use `NEXT_PUBLIC_TENANT_ID` and/or the tenant claim/user record; the current Next.js middleware only refreshes Supabase sessions and does not yet implement subdomain-based tenant resolution
- **API:** `resolveRequiredTenant` reads `x-tenant-id` and fails closed on missing or invalid tenant context for protected tenant-scoped routes; `resolveTenant` still exists for routes that intentionally allow a default fallback
- **Mobile:** `TENANT_ID` is a required compile-time value (`String.fromEnvironment`) and is attached to API calls through the Dio client/auth provider

## Branding

### Current Source of Truth

Runtime tenant branding lives in the `Brand` table, with JSON stored in `Brand.config`. `GET /api/brand` loads the brand row by tenant, applies row-level logo/favicon overrides, validates the config with Zod, and only returns valid configurations.

### Remaining Static Brand Dependencies

The codebase is not fully free of `config/brand.json` yet:

- `apps/web/next.config.js` imports it to generate marketing rewrites and neighborhood routes
- `apps/web/lib/brand.ts` still exposes static fallback helpers for local development and bootstrap paths
- `packages/database/prisma/seed.ts` uses it to seed the default tenant brand

This means branding is runtime DB-driven for product/API flows, but static brand JSON still participates in local fallback, seeding, and marketing route generation.

## Auth Flow

- **Web:** Supabase cookie sessions are refreshed in Next.js middleware via `@supabase/ssr`
- **API:** bearer JWTs are verified against Supabase JWKS (`/auth/v1/.well-known/jwks.json`) using ES256 and the `authenticated` audience, then cross-checked against the local `User` record and tenant scope
- **Mobile:** `supabase_flutter` manages auth state, and a Dio interceptor attaches/refreshed tokens for API requests

Provisioning and authentication are separate concerns: a valid Supabase token is not treated as a fully provisioned local app user until the corresponding `User` record exists in the tenant.

## Canonical Models

The current persisted core models are:

- `Tenant`
- `User`
- `Brand`
- `SavedSearch`
- `Favorite`
- `Tour`
- `TourStop`
- `AuditLog`

Shared DTOs and brand/theme contracts live in `packages/shared-types`.

## API Contracts

- Non-2xx API responses use the frozen envelope: `{ error: true, message: string, code: string, status: number }`
- Machine-readable codes are used on auth, tenant, brand, lead, geo, favorites, saved searches, and tours routes
- Persisted user-data routes require both auth and tenant context; listings/search remains publicly accessible

## Mobile State

The Flutter app has working bootstrap plumbing for:

- brand fetch on startup
- Supabase auth initialization
- Dio API client with tenant and auth token support
- GoRouter route guards
- ThemeData generation from brand config

Epic 15 replaced the placeholder feature screens with real mobile surfaces:

- `/search` is public and renders a list-first search UI using the mobile search controller/repository foundation
- `/listing/:id` is public and renders a PDP-style detail screen with preview fallback from Search route extras
- `/tour` is public as a local draft planner/current-tour screen; signed-out users can manage local draft stops, while persisted tour actions remain auth-gated

The mobile app intentionally does not yet include embedded map SDK work, route polyline rendering, navigation handoff, geofencing, TTS playback, Android Auto, favorites/saved searches/lead capture on the Epic 15 screens, share/export, or multi-tour archive/history UX.

## Testing and CI

- Root CI installs dependencies, builds `@project-x/shared-types`, runs lint, runs build, and runs API tests
- Lighthouse and hygiene workflows are present as non-blocking GitHub Actions
- Playwright specs exist under `apps/web/e2e`, but there is no blocking GitHub Actions workflow that runs them today
- The mobile app includes a focused Flutter test suite under `apps/mobile/test` covering routing, Search, Listing Detail, Tour draft/controller behavior, and Tour screen persistence states

## Deployment Notes

The repo does not currently include checked-in `vercel.json`, `railway.json`, or `railway.toml` files. Planning docs describe Vercel (web), Railway (API), Supabase (database/auth), and Codemagic (mobile) as deployment targets, but those targets are documented intent rather than repo-enforced configuration.

## Known Limitations

- Web tenant resolution is still env-driven (`NEXT_PUBLIC_TENANT_ID`) rather than subdomain-driven
- `config/brand.json` is still part of the runtime picture for marketing rewrites, local fallback, and seeding
- `apps/web/next.config.js` marketing rewrites and neighborhood pages are static and not tenant-aware
- Mobile Search, Listing Detail, and Tour planner/current-tour screens are implemented, but maps, navigation handoff, geofencing, TTS playback, Android Auto, and broader mobile platform hardening remain deferred
- E2E browser coverage exists, but it is not part of blocking CI
