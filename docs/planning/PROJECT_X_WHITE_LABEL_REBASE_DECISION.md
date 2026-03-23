# Project X White Label — Rebase Decision

**Last Updated:** 2026-03-23

---

## Decision

**The OG Project X codebase is the base for Project X White Label.**

The old copied White Label repo is reference-only, not the product base.

## Why OG Project X Is the Base

### What OG Project X Has (Verified via Audit)

1. **Working monorepo infrastructure**: pnpm workspaces, Turborepo, TypeScript, clean build/lint/test
2. **Mature search platform**: Next.js 14 with map + list + filters + PDP + AI search
3. **Robust API layer**: Express BFF with ListingProvider abstraction, SimplyRETS adapter, mock provider
4. **Provider pattern**: Clean interfaces for listing, lead, and CRM providers
5. **SimplyRETS integration**: Full parameter mapping, normalization, error handling, caching
6. **Lead system**: HubSpot provider, captcha, rate limiting, validation, normalization
7. **Tour Engine seeds**: Domain models in shared-types, planning service, API route, web UI (Tour Builder + Tour Panel)
8. **Theme foundation**: `config/theme.json` → Tailwind config token mapping
9. **Map integration**: Mapbox with lens UI, preview modal, geocoding service
10. **State management**: Zustand stores for listings, tour, lead modal, map lens
11. **Testing**: 77 passing API tests, 8 Playwright E2E specs
12. **CI**: GitHub Actions pipeline (install → build shared-types → lint → build)
13. **Security**: CORS, rate limiting, security headers, captcha, input validation

### What Would Be Lost Starting From Old White Label

- All of the above mature infrastructure
- Months of iteration on search, filters, provider abstractions
- Battle-tested SimplyRETS normalization and edge case handling
- Tour Engine domain modeling
- AI-assisted search infrastructure

## What Can Be Mined from Old White Label

- Specific white-label configuration patterns (if any existed beyond branding)
- Marketing page designs or content (low priority)
- Any Flutter mobile scaffolding beyond the skeleton (investigate if needed)
- Brand config approaches (if any were more sophisticated than theme.json)

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| OG has brand-specific hardcoding | Medium | Phase 1 cleanup — identified, bounded, fixable |
| OG has Michigan-specific neighborhood content | Low | Marketing layer is thin/replaceable |
| OG still has GoHighLevel code | Low | Behind provider interface, can be deprecated safely |
| Old WL had features not in OG | Low | Investigate and mine selectively |

## Conclusion

Copying from OG Project X was the correct decision. The brand coupling is surface-level and systematically fixable. The architectural foundations are strong and would take significant effort to recreate.
