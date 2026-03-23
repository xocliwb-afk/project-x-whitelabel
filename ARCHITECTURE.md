# Project X Architecture & Standards

**Status:** Active Development (Phase 0–1)  
**Architecture Type:** Single-tenant, white-label monorepo (future multi-tenant ready)

---

## 1. Overview

Project X is a white-label, Zillow-style real estate search platform delivering:

- A modern search experience (map + list + detail + scheduling)
- A multi-surface architecture (Web + Mobile)
- A backend-for-frontend (BFF) API
- Design-token driven theming for tenant branding

Only the folders below are part of the active architecture.

---

## 2. Canonical Stack

| Service       | Technology         | Location              | Responsibility                                                |
|---------------|--------------------|-----------------------|----------------------------------------------------------------|
| Web Client    | Next.js 14         | `apps/web`           | SSR, SEO, Search UI, Detail, Leads                            |
| API (BFF)     | Node.js/TypeScript | `apps/api`           | ListingProvider, normalization, compliance, CRM & tour seams  |
| Mobile        | Flutter            | `apps/mobile`        | Native app consuming normalized API                           |
| Shared Types  | TypeScript         | `packages/shared-types` | Canonical DTOs (`Listing`, `SearchRequest`, `ThemeConfig`) |

Everything else is **legacy** or **prototype**.

---

## 3. Core Architectural Patterns

### A. ListingProvider Abstraction

Frontend never talks directly to MLS vendors.

Flow: `Web/Mobile → API → ListingProvider → Vendor Adapter`.

### B. Normalized Data

All listings are converted to a canonical `Listing` DTO before reaching the client.

### C. Theming Engine

Branding lives in `theme.json` → CSS variables → Tailwind & Flutter themes.

### D. Compliance Layer

MLS/IDX rules enforced in API, not UI.

### E. Provider Seams

- ListingProvider  
- MapProvider  
- CrmProvider  
- TourEngine  

---

## 4. Directory Status

- ✅ `apps/` — active production code  
- ✅ `packages/` — active shared libraries  
- ⚠️ `prototypes/` — reference only  
- ⚠️ `legacy/` — old static site; reference only  

---

## 5. Development Workflow

### Install

```bash
pnpm install
```
