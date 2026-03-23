# SimplyRETS Error Handling Audit

**Last Updated:** 2026-03-23
**Epic:** 3 — Live Data Hardening

---

## Provider Error Paths

### `SimplyRetsListingProvider.search()`

| Scenario | Behavior | Status |
|----------|----------|--------|
| Non-200 response (401, 429, 500, etc.) | Throws `Error` with status code in message | OK — caught by route handler |
| Invalid JSON response | `res.json()` throws, propagates as unhandled | **Gap** — no explicit JSON parse error handling |
| Network timeout / connection refused | `fetch()` throws, propagates | OK — caught by route handler |
| Single listing fails to map | Caught in loop, logged, skipped (line 150-158) | Good — partial results still returned |
| Empty array response | Returns `[]` — no error | OK |
| Missing credentials | Constructor throws at startup | OK — fails fast |

### `SimplyRetsListingProvider.getById()`

| Scenario | Behavior | Status |
|----------|----------|--------|
| 404 response | Returns `null` | OK |
| Non-200/non-404 response | Throws `Error` | OK — caught by route handler |
| Invalid JSON response | `res.json()` throws | **Gap** — same as search |
| Mapping failure | Throws from `mapToListing`, propagates | OK — caught by route handler |

## Route-Level Error Handling

Both listing endpoints (`GET /api/listings` and `GET /api/listings/:id`) have:
- `try/catch` wrapping the full handler
- Structured `ApiError` response on failure (status 500)
- Request logging with duration, provider, and outcome

## Identified Gaps

### 1. Invalid JSON Response (Low Priority)
If SimplyRETS returns non-JSON (e.g., HTML error page), `res.json()` will throw a generic parse error. The route catch handles this, but the error message won't be informative.

**Recommendation (future):** Wrap `res.json()` in a try/catch with a descriptive message like "SimplyRETS returned invalid JSON".

### 2. No Rate Limit Awareness (Low Priority)
SimplyRETS may return 429 (rate limited). The provider treats this the same as any other error — throws and returns 500 to the client.

**Recommendation (future):** Detect 429 and return 503 with a `Retry-After` header to clients.

### 3. No Timeout Configuration (Low Priority)
`fetch()` uses Node.js default timeout behavior. For long-running requests, there's no explicit abort controller or timeout.

**Recommendation (future):** Add `AbortController` with a configurable timeout (e.g., 10s).

## Summary

Error handling is **adequate for current usage**. The provider throws on errors, routes catch and return structured error responses. The gaps identified are low-priority improvements, not crash-level issues. No fixes required in this epic.
