# Epic 11 Code Audit — Full Report

**PR:** #16 (4 commits, 55 files, +3530/−109)
**Scope:** Database, authentication, and tour persistence across Next.js web, Express API, and Flutter mobile.
**Auditor:** Claude Code
**Date:** 2026-03-23

---

## 1. Cross-Tenant Security

### CRITICAL — Tour list endpoint leaks cross-tenant data when user is unauthenticated

**File:** `apps/api/src/routes/tours.route.ts:19-28`

```typescript
const tours = await listTours({
  tenantId: req.tenantId!,
  userId: req.user?.id ?? null, // null when anonymous
});
```

When `req.user` is null (anonymous), `userId` is `null`. In `tour.repository.ts:findAll`, when `userId` is `null`, it's **not added to the where clause** — meaning the query returns **all tours for that tenant**, not just anonymous ones. Any anonymous user can see every tour created by every user in that tenant, including client names, addresses, and scheduled times.

**Fix:** Either require auth for listing tours, or explicitly filter to only tours where `userId IS NULL` for anonymous access.

### CRITICAL — No Row-Level Security (RLS) — tenant isolation is application-code only

**File:** `packages/database/prisma/schema.prisma`

The migration SQL contains zero RLS policies. Tables `saved_searches`, `favorites`, `audit_logs` have `tenantId` columns and indexes, but no repository code exists yet. When future code is written, there's no enforcement mechanism ensuring `tenantId` is always in the `WHERE` clause.

**Fix:** Implement PostgreSQL Row-Level Security policies as a defense-in-depth layer. Application-level checks alone are insufficient for multi-tenant isolation. At minimum, add RLS on `tours`, `tour_stops`, `users`, `saved_searches`, and `favorites`.

### WARNING — attachAuth silently drops user on tenant mismatch

**File:** `apps/api/src/middleware/auth.ts:35-37`

```typescript
if (req.tenantId && dbUser.tenantId !== req.tenantId) {
  return next(); // silently continues without attaching user
}
```

No logging, no signal to the caller. A legitimate user who accidentally sends the wrong `x-tenant-id` header gets treated as anonymous. Downstream `attachAuth`-protected routes (like tour listing) will then expose all anonymous tours.

**Fix:** Log the tenant mismatch. Consider returning a `X-Tenant-Mismatch: true` response header.

### WARNING — User table allows same Supabase identity in multiple tenants

**File:** `packages/database/prisma/schema.prisma`

`supabaseId` is globally unique, but the lazy-creation path in `auth.service.ts:login` creates a new local User row per tenant. A single Supabase account can exist in multiple tenants with different roles.

**Fix:** Decide on the intended design and document it. If one identity should not span tenants, add a check.

---

## 2. Auth Token Lifecycle

### CRITICAL — Web register flow performs double Supabase signUp

**Files:** `apps/web/stores/auth-store.ts:106-124` + `apps/api/src/services/auth.service.ts:42-50`

Web store calls `supabase.auth.signUp()` (client-side, creates Supabase user), then calls `POST /api/auth/register` which calls `supabaseAdmin.auth.signUp()` (server-side, same email). The second call **fails** with "User already registered".

**Web registration is broken at runtime.**

**Fix (Option A):** Web store should NOT call `supabase.auth.signUp()`. Call only `POST /api/auth/register`.
**Fix (Option B):** Create a `/api/auth/create-profile` endpoint that only creates the local DB row. Web store calls that after client-side signUp.

### CRITICAL — Logout API uses non-existent Supabase method

**File:** `apps/api/src/services/auth.service.ts:170`

```typescript
const { error } = await supabaseAdmin.auth.admin.signOut(jwt);
```

`auth.admin.signOut(jwt)` does not exist in the Supabase JS SDK. This will throw at runtime, making `POST /api/auth/logout` return 500.

Web clients work around this (auth-store.ts calls `supabase.auth.signOut()` client-side), but mobile clients calling the endpoint will fail.

**Fix:** Use the correct Supabase admin method or handle logout purely client-side.

### WARNING — Refresh endpoint has no rate limiting or tenant scoping

**File:** `apps/api/src/routes/auth.route.ts:107-122`

`POST /api/auth/refresh` accepts a `refreshToken` and returns new tokens with zero rate limiting and no `resolveTenant` middleware.

**Fix:** Add rate limiting. Consider binding refresh tokens to tenant context.

### WARNING — Mobile register sends password to backend (same double-signup bug)

**File:** `apps/mobile/lib/providers/auth_provider.dart:106-110`

The mobile register flow: signUp client-side, then POST to `/api/auth/register` which attempts a second Supabase signUp. Same broken pattern as web.

**Fix:** Same as web fix.

---

## 3. The supabase-admin.ts Proxy Pattern

### WARNING — Proxy only implements `get` trap

**File:** `apps/api/src/lib/supabase-admin.ts:23-27`

```typescript
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as any)[prop];
  },
});
```

Missing traps: `has`, `ownKeys`, `getPrototypeOf`. Consequences:
- `Object.keys(supabaseAdmin)` → `[]`
- `'auth' in supabaseAdmin` → `false`
- `supabaseAdmin instanceof SupabaseClient` → `false`

For current method-chaining usage (`supabaseAdmin.auth.signUp()`), this works correctly. The `get` trap intercepts `.auth` and delegates to the real client.

**Risk:** Fragile. Future code or libraries that do object introspection will break silently.

**Fix:** Drop the Proxy. Export `getSupabaseAdmin()` directly. Callers use `getSupabaseAdmin().auth.signUp()`.

### INFO — Lazy initialization pattern is sound

Deferring `createClient()` until first access (after `dotenv.config()`) correctly solves the import-time crash.

---

## 4. Tour Migration Fidelity

### WARNING — Tour ID format changed

**Old:** `tour-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}` (e.g., `tour-m1abc2d-k3ef5g`)
**New:** `tour-` + 12 chars of `md5(random())` via `@default(dbgenerated(...))` (e.g., `tour-a1b2c3d4e5f6`)

Client code that parses or validates tour ID format will break.

### WARNING — List ordering changed

**Old:** Insertion order (Map iteration).
**New:** `orderBy: { createdAt: 'desc' }` — newest first.

### WARNING — planTour has partial-write risk

**File:** `apps/api/src/services/tour.service.ts:56-86`

Creates tour (step 1), generates narrations (step 2), updates tour with narrations (step 3). If the server crashes between steps 1 and 3, the tour exists without narrations.

**Fix:** Wrap in a transaction, or accept that narrations can be regenerated via `GET /tours/:id/narrations`.

### INFO — scheduleStops algorithm is identical

Time-scheduling logic (duration + buffer iteration) is unchanged. Verified line-by-line.

### INFO — Clean migration, no dead code

The in-memory Map store was fully replaced. No leftover references or commented-out code.

---

## 5. Concurrent Request Safety

### CRITICAL — Race condition on lazy user creation during login

**File:** `apps/api/src/services/auth.service.ts:98-104`

```typescript
let dbUser = await userRepo.findBySupabaseId(signInData.user.id);
if (!dbUser) {
  dbUser = await userRepo.create({...});
}
```

Two concurrent logins for a new user: both pass `findBySupabaseId`, both try `create`, second hits unique constraint → unhandled Prisma P2002 → 500 to client.

**Fix:** Use `prisma.user.upsert()` or catch P2002 and retry with `findUnique`.

### WARNING — Dio interceptor concurrent refresh stampede

**File:** `apps/mobile/lib/services/auth_interceptor.dart:29-45`

If N requests get 401 simultaneously, N independent refresh calls fire. Supabase invalidates the old refresh token on use, so N−1 refreshes fail.

**Fix:** Implement a refresh mutex — queue concurrent 401 retries behind a single refresh.

### WARNING — Dio retry uses bare `Dio()` instance

**File:** `apps/mobile/lib/services/auth_interceptor.dart:39`

```dart
final response = await Dio().fetch(err.requestOptions);
```

The retry creates a new `Dio()` without interceptors, base URL, or timeouts from `ApiClient`. Headers like `x-tenant-id` from other interceptors will be missing.

**Fix:** Inject the original Dio instance and use it for retries.

---

## 6. Zustand Auth Store

### CRITICAL — onAuthStateChange listener is never cleaned up (memory leak)

**File:** `apps/web/stores/auth-store.ts:73-90`

```typescript
const supabase = createClient();
supabase.auth.onAuthStateChange(async (event, session) => { ... });
```

The subscription is never stored or unsubscribed. Each call accumulates another listener.

**Fix:** Store the subscription. Call `subscription.unsubscribe()` on cleanup. Expose a destroy method or use module-level tracking.

### WARNING — initialize() race on double-invocation

**File:** `apps/web/stores/auth-store.ts:55-57`

`isInitialized` isn't set to `true` until async work completes. React strict mode (dev) can double-fire `useEffect`, causing two concurrent `initialize()` calls and duplicate listeners.

**Fix:** `if (get().isInitialized || get().isLoading) return;`

### WARNING — Creates two separate Supabase client instances

**File:** `apps/web/stores/auth-store.ts:60,72`

`createClient()` is called twice in `initialize()` — once for session check, once for the listener.

**Fix:** Reuse the same variable.

---

## 7. Flutter Auth Provider

### WARNING — GoRouter doesn't re-evaluate routes on auth state changes

**File:** `apps/mobile/lib/core/routing/app_router.dart:43-58`

`redirect` reads `ref.read(authProvider)` on navigation events only. If auth state changes without navigation (e.g., token expiry), the user remains on protected routes.

**Fix:** Use GoRouter's `refreshListenable` parameter to trigger re-evaluation on auth changes.

### INFO — dispose() is correct but never called in practice

`AuthNotifier.dispose()` cancels `_authSub`. But as a global provider, it's never disposed during app lifetime.

### INFO — No infinite redirect loop risk

`/login` is in `_publicRoutes`. Unauthenticated users on `/login` stay put. Authenticated users on `/login` go to `/search`. No cycle.

---

## 8. Next.js Middleware

### INFO — @supabase/ssr cookie handling is correct

`apps/web/lib/supabase/middleware.ts` follows the canonical pattern: clone response, set cookies on both request and response, call `getUser()`.

### INFO — server.ts try/catch on setAll is correct

`apps/web/lib/supabase/server.ts` correctly wraps `setAll` in try/catch for Server Component read-only context.

### WARNING — Flash of unauthenticated state on page load

`AuthInitializer` uses `useEffect` (runs after first render). First render shows "Log In" link, then re-renders with `UserMenu` after session fetch.

**Fix:** Pre-fetch auth state server-side, or show a loading skeleton in Header while `!isInitialized`.

---

## 9. Error Response Consistency

### CRITICAL — Mobile /me parsing crashes (expects wrapped response)

**Files:** `apps/api/src/routes/auth.route.ts:74-76` + `apps/mobile/lib/providers/auth_provider.dart:138-141`

API returns: `res.json(req.user)` → `{ id, email, tenantId, ... }`

Mobile parses: `AuthUser.fromJson(data['user'])` → `data['user']` is `null` → **null dereference crash**

**Login, register, and initialization all crash on mobile.**

**Fix:** Either wrap the API response: `res.json({ user: req.user })`, or fix mobile parsing: `AuthUser.fromJson(data)`.

### WARNING — Prisma errors surface as generic 500s

**File:** `apps/api/src/server.ts:137-142`

Prisma errors (`P2002`, `P2025`, etc.) lack `status`/`statusCode`, so they all become `500 Internal server error`.

**Fix:** Add Prisma error mapping in the global handler (P2002→409, P2025→404).

### INFO — Logout uses `{ success: true }` shape

Different from the `{ error: true, message }` pattern but intentional per `LogoutResponse` type.

---

## 10. Missing or Incomplete Implementations

### WARNING — Hardcoded Supabase URL in mobile config

**File:** `apps/mobile/lib/core/config/app_config.dart:7-9`

```dart
defaultValue: 'https://bmkqwfiipbxktrihydxd.supabase.co',
```

Real Supabase project URL hardcoded. Leaks infrastructure details.

**Fix:** Remove the hardcoded URL. Require the env var or use a placeholder.

### WARNING — No email verification flow

Supabase signUp with email confirmation enabled (default) returns `session: null`. The register flow throws "no user or session". No email verification UI exists.

**Fix:** Disable email confirmation in Supabase, or add a verification flow.

### WARNING — No password reset flow

No forgot-password endpoint, no reset page, no `resetPasswordForEmail()` call anywhere.

### INFO — AuditLog table created but never written to

Presumably planned for a future epic.

### INFO — Two TODO comments in Android Auto service (outside Epic 11 scope)

---

## Summary

| # | Finding | Severity |
|---|---------|----------|
| 1 | Mobile `/me` parsing crashes on null dereference | **CRITICAL** |
| 2 | Web register double-signUp breaks registration | **CRITICAL** |
| 3 | Logout API calls non-existent Supabase method | **CRITICAL** |
| 4 | Login race condition on lazy user creation | **CRITICAL** |
| 5 | Anonymous tour list exposes all tenant tours | **CRITICAL** |
| 6 | No RLS — tenant isolation is app-code only | **WARNING** |
| 7 | Zustand auth listener never unsubscribed (leak) | **CRITICAL** |
| 8 | Zustand initialize() race on double-invocation | **WARNING** |
| 9 | GoRouter doesn't react to auth state changes | **WARNING** |
| 10 | Dio retry uses bare Dio() instance | **WARNING** |
| 11 | Concurrent Dio 401 refresh stampede | **WARNING** |
| 12 | Flash of unauthenticated state on page load | **WARNING** |
| 13 | Prisma errors become generic 500s | **WARNING** |
| 14 | Hardcoded Supabase URL in mobile config | **WARNING** |
| 15 | No email verification or password reset flows | **WARNING** |
| 16 | Refresh endpoint has no rate limiting | **WARNING** |
| 17 | Proxy only traps `get` | **WARNING** |
| 18 | Silent tenant mismatch in attachAuth | **WARNING** |
| 19 | Tour planTour partial-write risk | **WARNING** |
| 20 | Duplicate Supabase client in auth store | **WARNING** |
| 21 | Tour ID format change | **INFO** |
| 22 | Tour list ordering change | **INFO** |

**Ship-blockers (fix before deploy):** Items 1–5, 7. The mobile app will crash on every authenticated action, web registration is broken, logout throws, concurrent logins can 500, and anonymous users can see all tours in a tenant.
