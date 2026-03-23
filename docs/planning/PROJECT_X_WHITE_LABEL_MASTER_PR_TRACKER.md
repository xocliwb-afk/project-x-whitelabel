# Project X White Label — Master PR Tracker

**Last Updated:** 2026-03-23

---

## Epic Sequence

### Epic 0: Baseline Audit & Doctrine ← CURRENT
**Branch:** `feature/phase-0-baseline-audit`
**Status:** In Progress
**Goal:** Deep audit, planning docs, verification, identify coupling

**Acceptance Criteria:**
- [x] Repo deeply inspected (all apps, packages, config, scripts, tests, addendums)
- [x] 9 planning docs created in `docs/planning/`
- [x] Verification run: lint, build, typecheck, API tests — all pass *(Note: verification results are provisional from the OG repo and will be reconfirmed as part of Epic 1)*
- [x] Brand coupling inventory documented
- [x] Vendor leakage inventory documented
- [x] Next epic identified and scoped
- [ ] PR reviewed and approved

**Files Changed:**
- `docs/planning/` — 9 new planning/architecture docs

---

### Epic 1: Foundation Hardening (RECOMMENDED NEXT)
**Branch:** `feature/phase-1-foundation-hardening`
**Status:** Not Started
**Goal:** Remove dangerous brand/business coupling from core product paths; establish config-driven patterns

**Scope:**
1. Create `BrandConfig` type in shared-types
2. Upgrade `config/theme.json` → `config/brand.json` with full brand identity
3. Replace hardcoded "Brandon Wilcox Home Group" with brand config reads in:
   - `app/layout.tsx` (metadata)
   - `components/Header.tsx`
   - `components/Footer.tsx`
   - `components/Navbar.tsx`
4. Replace `talk-to-brandon` → `talk-to-agent` (generic intent)
5. Remove GoHighLevel lead provider
6. Remove hardcoded Michigan neighborhood slugs from `next.config.js` (make config-driven or remove)
7. Add `BrandConfig`, `ThemeConfig` types to shared-types
8. Verify all gates still pass

**Acceptance Criteria:**
- [ ] No hardcoded "Brandon" / "Wilcox" / "BWHG" in product code (web components, layout)
- [ ] Brand name, contact info, logo sourced from config
- [ ] GoHighLevel provider removed (not deprecated — fully deleted)
- [ ] Neighborhood slugs not hardcoded in next.config.js
- [ ] BrandConfig type exists in shared-types
- [ ] All tests pass
- [ ] Build succeeds

**Dependencies:** Epic 0 complete
**Drift Risk:** Do not start brand config admin UI. Do not refactor marketing pages. Do not add new providers.
**What NOT to absorb:** Flutter work, Tour Engine enhancements, Android Auto, marketing page redesign

---

### Epic 2: Shared Contracts Hardening
**Branch:** TBD
**Status:** Not Started
**Goal:** Add missing canonical types, identify vendor leakage

**Scope:**
- Add `TourRoute`, `TourRouteSegment` to shared-types
- Add `NarrationPayload`, `ProximityEvent` to shared-types
- Add `BrandConfig` to shared-types (if not done in Epic 1)
- Audit API responses for type consistency
- Document vendor leakage points

**Dependencies:** Epic 1 complete
**Drift Risk:** Do not implement narration/geofence logic yet — just the types

---

### Epic 3: Live Data Hardening
**Branch:** TBD
**Status:** Not Started
**Goal:** Verify SimplyRETS completeness, harden compliance

**Scope:**
- Audit SimplyRETS normalization for edge cases
- Implement real compliance logic (replace passthrough stub)
- Verify attribution display on web
- Test with live SimplyRETS sandbox data
- Ensure mock provider stays in sync with normalized shape

**Dependencies:** Epic 2 complete
**Drift Risk:** Do not add new listing providers. Do not build MLS admin.

---

### Epic 4: Brand Config System
**Branch:** TBD
**Status:** Not Started
**Goal:** File-based brand config with web consumption

**Scope:**
- `config/brand.json` as canonical brand config file
- Tailwind config reads from brand.json
- BrandProvider context for React components
- API endpoint for brand config (for mobile)
- Feature flags in brand config

**Dependencies:** Epic 1 (BrandConfig type), Epic 2 (shared-types hardened)
**Drift Risk:** Do not build multi-tenant runtime switching. Do not build admin UI.

---

### Epic 5: Core Web Product Stabilization
**Branch:** TBD
**Status:** Not Started
**Goal:** Search, map/list, PDP, lead/contact all consume brand config

**Scope:**
- All product surfaces read from brand config
- No residual hardcoded brand references
- Lead form generic ("Talk to Agent" not "Talk to Brandon")
- Route continuity verified
- Search URL state completeness

**Dependencies:** Epic 4
**Drift Risk:** Do not redesign search UI. Do not add new features.

---

### Epic 6: Mobile Architecture Foundation
**Branch:** TBD
**Status:** Not Started
**Goal:** Make apps/mobile a real Flutter app

> **Note:** Mobile shared contracts and API expectations are DESIGNED in Epics 1-2 (BrandConfig type, shared-types). Flutter implementation begins in Epic 6.

**Scope:**
- Flutter project setup with dependencies
- Navigation, API client, state management
- Brand config loading → ThemeData
- Dart model classes for core types

**Dependencies:** Epic 4 (brand config), Epic 2 (shared-types)

---

### Epic 7: Tour Engine Foundation
**Branch:** TBD
**Status:** Not Started
**Goal:** Tour Engine to production quality

> **Note:** Tour domain models already exist in shared-types (Tour, TourStop, PlanTourRequest). Epic 7 enhances and hardens them — it does not start from zero.

**Scope:**
- Route/direction integration
- Tour persistence
- Enhanced web + mobile UI
- Tour sharing

**Dependencies:** Epic 5, Epic 6

---

### Epic 8: Narration / Geofence / Android Auto
**Branch:** TBD
**Status:** Not Started

**Dependencies:** Epic 6 (Flutter), Epic 7 (Tour Engine)

---

### Epic 9: HubSpot Hardening
**Branch:** TBD
**Status:** Not Started
**Goal:** Production-quality HubSpot integration

**Dependencies:** Epic 5

---

## Dependency Graph

```
Epic 0 (Audit)
  └── Epic 1 (Foundation Hardening)
      ├── Epic 2 (Shared Contracts)
      │   ├── Epic 3 (Live Data)
      │   └── Epic 4 (Brand Config)
      │       ├── Epic 5 (Web Stabilization)
      │       │   ├── Epic 7 (Tour Engine)
      │       │   └── Epic 9 (HubSpot)
      │       └── Epic 6 (Mobile Foundation)
      │           └── Epic 8 (Android Auto/Narration)
      └── Epic 7 depends on Epic 5 + 6
```

## Anti-Absorption Rules

Each epic must NOT absorb work from other epics. Specifically:

- **Epic 1** must not include Flutter work, tour enhancements, or marketing redesign
- **Epic 2** must not implement narration logic — only define types
- **Epic 3** must not add new listing providers
- **Epic 4** must not build multi-tenant or admin UI
- **Epic 5** must not redesign search UX or add new features
- **Epic 6** must not implement Android Auto — only Flutter foundation
- **Epic 7** must not implement route optimization — only foundation
- **Epic 8** must not build production Android Auto — only architecture + prototype
