# Vendor Leakage Audit

**Last Updated:** 2026-03-23
**Epic:** 2 — Shared Contracts Hardening

---

## What Is Vendor Leakage?

Vendor leakage occurs when raw vendor-specific field names, types, or strings appear in client-facing code (web, mobile) instead of being abstracted behind the provider/adapter layer in the API.

---

## SimplyRETS Leakage

### Architecture (Correct)

The provider pattern is correctly implemented:
- `apps/api/src/providers/simplyrets.provider.ts` — adapter that maps raw SimplyRETS → `NormalizedListing`
- Web app imports `Listing` / `NormalizedListing` from `@project-x/shared-types` — never raw SimplyRETS types
- No raw SimplyRETS types or field names (`raw.property`, `raw.geo`, `raw.mls`) appear in web app code

### Leakage Found

| Location | Issue | Severity | Fix Epic |
|----------|-------|----------|----------|
| `apps/web/lib/listingFormat.ts:8` | Hardcoded string `"Data provided by SimplyRETS"` | Medium | Epic 3 or 5 |
| `apps/web/lib/listingFormat.ts:10` | Hardcoded string `"Data provided by SimplyRETS"` | Medium | Epic 3 or 5 |
| `apps/web/next.config.js:30` | Image remote pattern for `s3-us-west-2.amazonaws.com/cdn.simplyrets.com` | Low | Leave (operational, not user-facing) |
| `apps/web/public/marketing/index.html:246` | Static marketing HTML references SimplyRETS | Low | Out of scope (marketing page) |
| `apps/web/public/marketing/assets/js/main.js:865` | Marketing JS references SimplyRETS | Low | Out of scope (marketing page) |

### Recommended Fixes

1. **`listingFormat.ts` attribution** — Should use `listing.attribution?.disclaimer` or `listing.attribution?.mlsName` instead of hardcoding "SimplyRETS". The normalized listing already carries `attribution.mlsName` and `attribution.disclaimer` from the API adapter. Fix in Epic 5 (Web Stabilization).

2. **Image remote patterns** — The `cdn.simplyrets.com` pattern in `next.config.js` is an operational concern (allowing image loading from that CDN). This is acceptable and does not leak vendor details to users.

3. **Marketing pages** — Static HTML and JS in `public/marketing/` are brand-specific content, not product code. Out of scope for vendor leakage cleanup.

---

## Other Vendor Considerations

### MLS Field Names in Shared Types

The `NormalizedListing` type uses generic field names (`mlsId`, `mlsName`, `daysOnMarket`) rather than vendor-specific ones. This is correct — `mlsId` is a domain concept, not a SimplyRETS concept.

### HubSpot

HubSpot integration is correctly contained within the API:
- `apps/api/src/providers/crm/hubspot.provider.ts` — HubSpot-specific code
- `apps/api/src/providers/lead/hubspot-lead.provider.ts` — HubSpot-specific code
- No HubSpot field names, types, or SDK references in web app code

### CRM Type References

The `CRMType` union in shared-types includes `'hubspot'` — this is acceptable as it's a configuration enum, not raw vendor data leaking to clients.

---

## Summary

| Category | Status |
|----------|--------|
| Raw vendor types in web app | **Clean** — no raw SimplyRETS types imported |
| Raw vendor field names in web app | **Clean** — all normalized |
| Hardcoded vendor strings in web app | **2 instances** in `listingFormat.ts` (fix in Epic 5) |
| Vendor strings in marketing pages | Present but out of scope |
| Provider pattern (API adapter boundary) | **Correctly implemented** |
| HubSpot containment | **Clean** |
