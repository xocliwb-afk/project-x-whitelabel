# Lighthouse CI (LHCI) Quickstart

This repo runs Lighthouse CI (LHCI) as a **non-blocking** GitHub Actions workflow to track stability and performance across Tier-1 pages.

## What it does
- Audits the URLs listed in `lighthouserc.json` (multiple runs per URL; currently `numberOfRuns: 3`)
- Uses warn-first assertions (does **not** block merges)
- Uploads reports as an artifact named **`lhci-reports`**

## Trigger the workflow

### GitHub UI
1) Open **Actions** → **lighthouse (non-blocking)**
2) Click **Run workflow**
3) Choose branch **main**
4) Click **Run workflow**

### CLI
```bash
# trigger
gh workflow run lhci-nonblocking.yml --ref main

# find the newest run
gh run list --workflow=lhci-nonblocking.yml --limit 5

# watch a specific run
RUN_ID=<id from list>
gh run watch "$RUN_ID" --exit-status
```

## Where to find reports
After the run finishes:
```bash
RUN_ID=<id from above>
gh run download "$RUN_ID" -n lhci-reports -D /tmp/lhci-latest
ls /tmp/lhci-latest/artifacts/lhci   # lhci.log, *.report.json, *.report.html
```

## Summarize scores quickly
Use the helper script in this repo:
```bash
./scripts/lhci_fetch_and_summarize.sh <RUN_ID> [/tmp/output-dir]
```
The script downloads the artifact and prints avg/min/max for Performance / Accessibility / Best Practices / SEO per URL.

## Manual /search LHCI run (search-specific config)
- Workflow: **lighthouse-search (manual)**
- Config: `lighthouserc.search.json`
- Artifacts: `lhci-reports` (path inside artifact: `artifacts/lhci-search`)

### Trigger via CLI
```bash
gh workflow run lhci-search-manual.yml --ref main
gh run list --workflow=lhci-search-manual.yml --limit 5
RUN_ID=<id from list>
gh run watch "$RUN_ID" --exit-status
```

### Download and summarize
```bash
RUN_ID=<id>
gh run download "$RUN_ID" -n lhci-reports -D /tmp/lhci-search-latest
./scripts/lhci_fetch_and_summarize.sh "$RUN_ID" /tmp/lhci-search-latest | head
```
