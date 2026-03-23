#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <RUN_ID> [OUT_DIR]" >&2
  exit 1
fi

RUN_ID="$1"
OUT_DIR="${2:-/tmp/lhci-${RUN_ID}}"

echo "[lhci] downloading lhci-reports for run ${RUN_ID} to ${OUT_DIR}"
rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"

gh run download "${RUN_ID}" -n lhci-reports -D "${OUT_DIR}"

RUN_ID="$RUN_ID" OUT_DIR="$OUT_DIR" python3 - <<'PY'
import glob, json, os, statistics
from collections import defaultdict

out_dir = os.environ["OUT_DIR"]
paths = glob.glob(os.path.join(out_dir, "**", "*.report.json"), recursive=True)
if not paths:
    print("No *.report.json files found under:", out_dir)
    raise SystemExit(1)

rows = defaultdict(list)
for p in paths:
    with open(p, "r", encoding="utf-8") as f:
        j = json.load(f)
    url = j.get("finalUrl") or j.get("requestedUrl") or os.path.basename(p)
    cats = j.get("categories", {})
    rows[url].append({
        "performance": cats.get("performance", {}).get("score"),
        "accessibility": cats.get("accessibility", {}).get("score"),
        "best-practices": cats.get("best-practices", {}).get("score"),
        "seo": cats.get("seo", {}).get("score"),
    })

def pct(x):
    return f"{x*100:5.1f}%" if isinstance(x, (int, float)) else "  n/a "

print(f"Found {len(paths)} reports across {len(rows)} URLs.\n")

for url in sorted(rows.keys()):
    runs = rows[url]
    print("=" * 100)
    print(url)
    print(f"runs: {len(runs)}")
    for k in ["performance", "accessibility", "best-practices", "seo"]:
        vals = [r[k] for r in runs if isinstance(r[k], (int, float))]
        if not vals:
            print(f"  {k:14}  no data")
            continue
        avg = statistics.mean(vals)
        mn = min(vals)
        mx = max(vals)
        print(f"  {k:14}  avg {pct(avg)}   (min {pct(mn)}, max {pct(mx)})")
print("\nDone.")
PY
