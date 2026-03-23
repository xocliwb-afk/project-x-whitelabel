# Project X White Label — Master Plan

**Status:** Phase 0 — Baseline Audit & Doctrine
**Last Updated:** 2026-03-23
**Base Repo:** `project-x-whitelabel` (copied from OG Project X)

---

## 1. Product Definition

Project X White Label is a **multi-surface, white-label real estate search platform** that competes with basic IDX products. It is NOT a brochure site, NOT a marketing CMS, and NOT a demo.

### What It Is
- A full-featured property search platform (map + list + detail + filters + AI-assisted search)
- A white-label system where brand, theme, content, and behavior are driven by configuration
- A multi-surface product: web, Flutter mobile app, Android Auto companion
- A Tour Engine for scheduling and routing property showings
- A narration/geofence system for arrival detection and location-aware announcements

### What It Is NOT
- A static marketing site generator
- A CMS or admin dashboard
- A GoHighLevel integration project
- A single-tenant hardcoded site for one agent/broker

---

## 2. Product Pillars (Non-Negotiable)

1. **Search Platform** — Map + list + PDP + filters + AI search. This is the product center.
2. **White-Label Brand Config** — File-driven brand identity (not code changes per tenant)
3. **Live Data via SimplyRETS** — Normalized listing provider with compliance
4. **Flutter Mobile App** — Native companion consuming the same API and brand config
5. **Tour Engine** — Add-to-tour, sequencing, routing, scheduling
6. **Android Auto + Narration** — Arrival detection, geofenced announcements, TTS
7. **HubSpot CRM** — The only CRM direction; GoHighLevel is dead

---

## 3. Phased Roadmap

### Phase 0 — Baseline Audit & Doctrine ← CURRENT
- Deep repo inspection
- Planning docs creation
- Verification of build/lint/test gates
- Identification of brand coupling and vendor leakage

### Phase 1 — Foundation Hardening
- Ensure clean boot (web + API + shared-types)
- Remove dangerous brand/business coupling from core product paths
- Establish env-driven configuration patterns
- Do NOT over-refactor marketing pages

### Phase 2 — Shared Contracts + White-Label Targets
- Harden shared-types with missing canonical types (BrandConfig, ThemeConfig, TourRoute, NarrationPayload, ProximityEvent)
- Identify and document vendor leakage points
- Design brand config loading path

### Phase 3 — Live Data Hardening
- Verify SimplyRETS provider completeness
- Normalize provider outputs for all edge cases
- Harden filter semantics and compliance/attribution
- Maintain dev-safe mock path

### Phase 4 — Brand Config System
- File-based brand config (JSON)
- Support theme/assets/copy/nav/search/PDP/contact labels
- Web + mobile consumption paths
- Secrets out of public config

### Phase 5 — Core Web Product Stabilization
- Search, map/list, PDP, lead/contact flows
- Route continuity
- Brand residue cleanup in critical product surfaces

### Phase 6 — Mobile Architecture & Foundation
- Make apps/mobile a real Flutter app (not skeleton)
- Consume brand config + live data + shared contracts
- State management, navigation, API layer

### Phase 7 — Tour Engine Foundation
- Domain models, API shape, add-to-tour flow
- Route/sequence model
- Web + mobile touchpoints

### Phase 8 — Narration / Geofence / Android Auto
- Arrival detection design
- Proximity events and narration payloads
- TTS integration
- Android Auto surface
- Flutter/native boundary design

### Phase 9 — HubSpot Hardening
- Preserve HubSpot integration
- Do not let CRM dominate architecture
- GoHighLevel removal

---

## 4. Sequencing Rules

- Each phase produces at least one scoped PR with acceptance criteria
- No phase absorbs work from future phases
- Shared contracts must stabilize before multi-surface implementation spreads
- Brand config spec must exist before brand config implementation begins
- Tour Engine domain models must exist before Tour UI work begins
- Mobile architecture doc must exist before Flutter implementation begins

---

## 5. Anti-Drift Rules

- The product center is SEARCH, not marketing pages
- White-labeling is config-driven, not code-fork-driven
- GoHighLevel is dead — do not revive it
- Do not build a CMS/admin system
- Do not overinvest in static marketing pages
- Do not silently minimize Tour Engine, Flutter, or Android Auto
- Do not merge without verification evidence
- Do not widen PR scope beyond the approved epic
