# Tooling Runbook (Project X)

This repo includes **tooling-only** checks designed to surface risk early, prevent regressions, and make performance issues obvious. These tools do **not** change production behavior unless explicitly enabled (e.g., bundle analyzer).

## Quick commands (local)

From repo root:

### Correctness
- Typecheck (monorepo baseline):
  - `pnpm typecheck`

### Hygiene (report-only)
- Unused files/exports/deps (Knip):
  - `pnpm knip:report`
- Circular dependency scan (Madge):
  - `pnpm madge:circular:report`

### Web bundle inspection (opt-in)
- Next bundle analyzer (web only; opt-in):
  - `pnpm --dir apps/web analyze`
  - (Equivalent: `ANALYZE=true pnpm --dir apps/web build`)

### API deep profiling (manual-only)
- Clinic Doctor / Flame (apps/api):
  - `pnpm --dir apps/api profile:doctor`
  - `pnpm --dir apps/api profile:flame`
- Full instructions: `docs/profiling.md`

## CI workflows (non-blocking)

These workflows are **non-blocking** (they should not gate merges). They exist to provide visibility and upload artifacts.

### Typecheck (non-blocking)
- Workflow: typecheck (non-blocking)
- What it does: runs `pnpm typecheck`
- Where to find results: GitHub Actions run logs

### Hygiene (non-blocking)
- Workflow: hygiene (non-blocking)
- What it does: runs:
  - `pnpm knip:report`
  - `pnpm madge:circular:report`
- Artifacts: `hygiene-reports` (contains text outputs)

### Lighthouse (non-blocking)
- Workflow: lighthouse (non-blocking) (manual + scheduled)
- What it does: runs Lighthouse CI against the URLs listed in `lighthouserc.json`
- Artifacts: `lhci-reports` (LHCI logs + generated report output)
- Notes:
  - LHCI only tests the URLs listed in `lighthouserc.json` (it does not crawl the whole site).
  - Start with stable URLs (marketing pages) and expand gradually.

## How to interpret results (do not “fix blindly”)

### Typecheck
- Treat as hard correctness signal.
- Prefer real fixes over suppressions (`any`, `@ts-ignore`) unless there is a specific, justified reason.

### Knip (unused)
- Knip is a **lead**, not truth. False positives happen with:
  - dynamic imports
  - framework entrypoints (Next routes/layouts)
  - generated code
- Before deleting anything:
  - confirm usage via repo search
  - run mandatory gates after removal
- Keep cleanup PRs small and reversible.

### Madge (circular deps)
- Cycles can cause unpredictable runtime behavior and are hard to debug later.
- Not every cycle must be fixed immediately; prioritize:
  - cycles involving runtime-critical modules
  - cycles that correlate with “weird” behavior or build issues
- Fix in small PRs; verify via gates.

### Bundle analyzer (ANALYZE=true)
- Use when performance changes are suspected or after adding new dependencies.
- Watch for:
  - large libraries pulled into client bundles
  - server-only modules accidentally imported in client code
- Compare “before vs after” when making changes.

### Lighthouse CI
- Use for trend detection and regression visibility.
- Keep it warn-first until stable baselines exist.
- Expand URLs gradually; avoid flaky pages early (e.g., pages requiring live API data).
- Tighten thresholds only after repeated stable runs.

### Clinic.js profiling (apps/api)
- Use only when diagnosing real slowness (CPU hotspots, event-loop blocking, async waterfalls).
- Do not commit outputs; Clinic outputs are ignored via `.clinic/` in `.gitignore`.
- Run with a specific repro and traffic (see `docs/profiling.md`).

## Merge discipline
Even for tooling/docs PRs, follow the repo’s required gates before merge:
- `pnpm --dir apps/web lint`
- `rm -rf apps/web/.next && pnpm --dir apps/web build`
- `pnpm e2e:search`
