# Project X White Label — Agent Context

**Purpose:** Standing rules for all future AI agents working on this project.
**Last Updated:** 2026-03-23

---

## 1. What This Product Is

A **multi-surface, white-label real estate search platform** built as a monorepo:

| Surface | Tech | Location |
|---------|------|----------|
| Web | Next.js 14 + Tailwind + Zustand + Mapbox | `apps/web` |
| API (BFF) | Express + TypeScript + Zod | `apps/api` |
| Mobile | Flutter | `apps/mobile` |
| Shared Types | TypeScript | `packages/shared-types` |
| Theme/Brand | JSON config | `config/brand.json` (canonical — theme.json is legacy, migrated in Epic 1) |

## 2. What This Product Is NOT

- A static marketing site generator
- A CMS or admin dashboard builder
- A GoHighLevel integration project
- A demo or prototype — this ships

## 3. Priority Order

1. Search platform (map + list + PDP + filters)
2. White-label brand config system
3. Live data via SimplyRETS (with mock fallback)
4. Lead capture via HubSpot
5. Tour Engine (scheduling, routing, sequencing)
6. Flutter mobile app
7. Android Auto + narration/geofence
8. Thin marketing layer (minimal, not the product center)

## 4. Canonical Architecture Patterns

- **ListingProvider abstraction**: Frontend never talks to MLS vendors directly
- **Normalized data**: All listings converted to `NormalizedListing` DTO before client
- **Provider seams**: ListingProvider, CrmProvider, LeadProvider — all behind interfaces
- **Theme via JSON**: `config/brand.json` → Tailwind CSS tokens → components (theme.json is legacy)
- **Compliance in API**: MLS/IDX rules enforced in BFF, not in UI
- **Shared types**: Canonical contracts in `packages/shared-types`

## 5. What NOT To Do

- Do NOT revive GoHighLevel (it is dead)
- Do NOT reference GoHighLevel as a supported provider — it is removed, not deprecated
- Do NOT build a CMS or admin panel
- Do NOT overinvest in static/marketing pages
- Do NOT hardcode brand/business names in product code
- Do NOT let CRM concerns dominate architecture
- Do NOT merge PRs without verification evidence
- Do NOT absorb future-phase work into current epic
- Do NOT widen scope beyond what was approved
- Do NOT add new vendor integrations without explicit approval
- Do NOT casually re-enable unsafe live integrations in dev

## 6. Key Env Variables

| Variable | Purpose |
|----------|---------|
| `DATA_PROVIDER` | `mock` or `simplyrets` |
| `LEAD_PROVIDER` | `mock` or `hubspot` |
| `SIMPLYRETS_USERNAME/PASSWORD` | SimplyRETS credentials |
| `HUBSPOT_PRIVATE_APP_TOKEN` | HubSpot API token |
| `MAPBOX_GEOCODE_TOKEN` | Mapbox geocoding |
| `GEMINI_API_KEY` | AI search assistance |
| `NEXT_PUBLIC_API_BASE_URL` | API proxy target |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox map rendering |

## 7. File Structure Rules

- `apps/web` — Web product (Next.js 14)
- `apps/api` — BFF/API server (Express)
- `apps/mobile` — Flutter mobile app
- `packages/shared-types` — Canonical shared TypeScript contracts
- `config/` — Brand/theme configuration
- `docs/planning/` — Planning and architecture docs
- `marketing/` — Static marketing content (reference only)
- `Adendums/` — Product intent evidence (read-only reference)

## 8. PR and Workflow Rules

- Small, scoped PRs with acceptance criteria
- Each PR must have verification evidence
- Do not merge if verification is broken (unless clearly pre-existing)
- Do not fold multiple epics into one PR
- Report what was done AND what was NOT done
