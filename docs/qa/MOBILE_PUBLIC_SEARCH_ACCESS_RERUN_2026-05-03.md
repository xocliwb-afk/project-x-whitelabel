# Mobile Public Search Access Rerun — 2026-05-03

## 1. Header
- Branch: `qa/mobile-public-search-access-rerun`
- Commit tested: `ee0c883 fix(mobile): allow signed-out access to Search (#54)`
- Date: 2026-05-03
- Mode: Focused Android QA rerun after PR #54
- Target: Pixel_6_API_36 / emulator-5554
- Epic status: Epic 15 complete; Epic 16 not started

## 2. Context
- PR #54 added `Browse listings` to Sign In and Create Account screens.
- Goal was to verify signed-out users can reach Search without signing in.
- Embedded map, route polylines, navigation handoff, Android Auto, geofencing, and TTS are out of scope.

## 3. Environment
- Android emulator: Pixel_6_API_36 / emulator-5554
- API base URL: `http://10.0.2.2:3002`
- Supabase URL: `https://bmkqwfiipbxktrihydxd.supabase.co`
- `SUPABASE_ANON_KEY=***`
- `TENANT_ID=ac5caf15-572b-43d5-8b7f-943cbbb5134d`
- Local API `/health`: 200 OK
- Local API `/ready`: 200 OK
- Local API `/api/brand`: 200 OK

## 4. Focused QA results

| Flow | Status | Evidence / notes | Severity if issue |
| --- | --- | --- | --- |
| App boot / Sign In screen | PASS | App launched on Android emulator and rendered Sign In screen. | N/A |
| Browse listings action visible | PASS | `Browse listings` button/link was visible on Sign In screen after PR #54. | N/A |
| Signed-out Browse listings opens Search | PASS | Tapping `Browse listings` navigated to Search without signing in. | N/A |
| Search result rendering | PASS | Search rendered listing results while signed out. | N/A |
| Listing Detail opens from Search | PASS | Listing Detail previously rendered from Search with hero image, price, address, facts, Add to tour button, and description. | N/A |
| Add to Tour button visible | PASS/PARTIAL | Add to Tour button was visible on Listing Detail; resulting tour state was not fully validated in this focused rerun. | N/A |
| Map/navigation not expected | OUT_OF_SCOPE/FUTURE | Embedded map, route polylines, and navigation handoff remain future/out-of-scope. | N/A |

## 5. Findings table

No P0/P1 blockers were found for signed-out Search access in this focused rerun.

| ID | Severity | Area | Summary | Evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| QA-PUBLIC-SEARCH-RERUN-001 | OUT_OF_SCOPE/FUTURE | Full tour validation | This rerun verified signed-out Browse listings → Search access, but did not fully validate Add-to-Tour resulting state or Tour screen state. | Add to Tour button was visible; resulting tour state was not fully exercised. | Run a separate focused Tour/Add-to-Tour QA pass if needed before Epic 16. |

## 6. Recommended next action
- If accepting Add-to-Tour/Tour state risk: begin Epic 16 planning only.
- If not accepting risk: run focused Android QA for Add-to-Tour → Tour screen state before Epic 16.
- Do not start Epic 16 implementation until remaining mobile QA risk is accepted.

## 7. Scope confirmation
- No Epic 16 work.
- No Android Auto implementation.
- No geofencing.
- No TTS playback.
- No platform channels.
- No native services.
- No maps/navigation work.
- No app/API/web/CI/package/schema changes.
- No dependency changes.
- No bug fixes.
- No secrets committed.
- No screenshots/binary files committed.
