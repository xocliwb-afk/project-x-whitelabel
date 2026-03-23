# API Profiling (Clinic.js)

This repo includes **manual-only** profiling scripts for `apps/api` using **Clinic.js**. These are for diagnosing real performance issues (CPU, event-loop blocking, async waterfalls). They are **not** part of CI.

## Prereqs (Fedora / Linux)
- Node and pnpm installed (use the repo’s normal workflow)
- Chrome/Chromium installed (Clinic outputs HTML reports)
- Linux profiling support:
  - Recommended: `perf` (Fedora package name is typically `perf`)
  - Install: `sudo dnf install perf` (if you get “perf not found” errors)

## Build the API
From repo root:
- `pnpm --dir apps/api build`

## Run Doctor (general health)
- `pnpm --dir apps/api profile:doctor`

What to do while it runs:
- In another terminal, generate traffic for ~30–60 seconds.
  - Hit a simple endpoint repeatedly (or use your existing e2e flow if appropriate).
- Stop the server when you’ve captured enough activity (Ctrl+C).

Output:
- Clinic will generate a report (HTML) and print the path in the terminal.
- Open the report locally (Fedora KDE):
  - `xdg-open <path-to-report.html>`

## Run Flame (CPU hotspot analysis)
- `pnpm --dir apps/api profile:flame`

Same workflow: run traffic, stop, then open the resulting HTML report.

## Tips
- Prefer profiling in a clean state (no other heavy processes).
- Profile a specific repro (one slow endpoint/flow) rather than random browsing.
- Do not commit profiling outputs to git.
