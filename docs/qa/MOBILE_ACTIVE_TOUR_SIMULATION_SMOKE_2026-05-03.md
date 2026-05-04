# Mobile Active Tour Simulation Smoke — 2026-05-03

## 1. Header
- Branch: `qa/mobile-active-tour-simulation-smoke`
- Commit tested: `e60e960 feat(mobile): add active-tour simulation screen (#61)`
- Date: 2026-05-03
- Mode: Android emulator active-tour simulation QA
- Target: Pixel_6_API_36 / emulator-5554
- Epic status: Epic 16 active-tour simulation, no native/location/audio scope

## 2. Context
- PR #57 added active-tour runtime state.
- PR #58 added narration loading/selection.
- PR #59 added simulated proximity source/direct handling.
- PR #60 wired event source to active-tour runtime.
- PR #61 added `/tour/drive/:tourId` and ActiveTourScreen.
- PR #63 added `View tour` actions to Add-to-Tour snackbars.
- This QA validates the simulation-only runtime path.
- No real TTS, GPS, geofencing, Android Auto, maps, route polylines, or navigation handoff expected.

## 3. Environment
- Android emulator: Pixel_6_API_36 / emulator-5554
- API base URL: `http://10.0.2.2:3002`
- Supabase URL: `https://bmkqwfiipbxktrihydxd.supabase.co`
- `SUPABASE_ANON_KEY=***`
- `TENANT_ID=ac5caf15-572b-43d5-8b7f-943cbbb5134d`
- Local API `/health`: 200 OK
- Local API `/ready`: 200 OK
- Local API `/api/brand`: 200 OK
- Local API `/api/listings?limit=3`: 200 OK with listing results

## 4. Automated validation
- `flutter pub get`: passed. Non-fatal pub.dev advisory decode warnings were printed for hosted package advisory metadata.
- `flutter analyze`: passed, no issues found.
- `flutter test`: passed, all tests passed.
- `flutter build apk --debug`: passed; debug APK built successfully.

## 5. Manual QA checklist results

| Flow | Status | Evidence / notes | Severity if issue |
| --- | --- | --- | --- |
| App boot / brand bootstrap | PASS | App launched on Pixel_6_API_36 / `emulator-5554`. No fatal Flutter red screen was reported. Previous app configuration error was not observed. First captured observation was Search. | N/A |
| Signed-out Browse listings | PARTIAL | Search was observed on Android with listings visible. The explicit Sign In `Browse listings` tap was not separately re-confirmed during this focused pass. Screenshot observed locally: `/home/bwilcox/Pictures/Screenshots/Screenshot_20260503_202643.png`; image not committed. | ENV/setup |
| Search results | PASS | Search rendered with `20 listings shown` and listing cards containing photos, prices, addresses, bed/bath/sqft/status, and days on market. | N/A |
| Listing Detail | PASS | Tapping a listing opened Listing Detail. Hero image, price, address, status, facts, description, and `Add to tour` button were visible. Screenshot observed locally: `/home/bwilcox/Pictures/Screenshots/Screenshot_20260503_202736.png`; image not committed. | N/A |
| Add to Tour | PARTIAL | `Add to tour` button was visible and user confirmed it worked. App stayed stable with no fatal red screen. Exact feedback/state was not fully captured, and no Tour screen path became visible. | P1 major |
| Tour screen | FAIL | User confirmed there was no visible Tour screen path after Add to Tour in the observed flow. | P1 major |
| Drive mode entry | SKIPPED / BLOCKED | Blocked because the Tour screen/current saved tour card was not reachable in the observed UI flow. `Drive mode` was therefore not visible. | P1 major |
| Active Tour screen baseline | SKIPPED / BLOCKED | Not run because Drive mode was not reachable. | P1 major |
| Start control | SKIPPED / BLOCKED | Not run because Active Tour screen was not reached. | P1 major |
| Simulate approaching | SKIPPED / BLOCKED | Not run because Active Tour screen was not reached. | P1 major |
| Simulate arrived | SKIPPED / BLOCKED | Not run because Active Tour screen was not reached. | P1 major |
| Next / Previous | SKIPPED / BLOCKED | Not run because Active Tour screen was not reached. | P1 major |
| End control | SKIPPED / BLOCKED | Not run because Active Tour screen was not reached. | P1 major |
| TTS/audio | OUT_OF_SCOPE/FUTURE | Real audio/TTS not expected in this pass. | N/A |
| Map/navigation/GPS | OUT_OF_SCOPE/FUTURE | Maps, route polylines, navigation handoff, real GPS/geofencing, and Android Auto not expected. | N/A |

## 6. Rerun after PR #63 — View tour affordance
- PR #63 added `View tour` actions to Add-to-Tour snackbars.
- Rerun date: 2026-05-03.
- Device: Pixel_6_API_36 / `emulator-5554`.
- Local API validation: `/health`, `/ready`, `/api/brand`, and `/api/listings?limit=3` returned 200 OK.
- Automated validation passed: `flutter pub get`, `flutter analyze`, `flutter test`, and `flutter build apk --debug`. Non-fatal pub.dev advisory decode warnings were printed during dependency resolution.
- Runtime launch: app launched with runtime config and rendered Sign In (`Welcome Back`) first. No fatal Flutter red screen was visible.

| Flow | Status | Evidence / notes | Severity if issue |
| --- | --- | --- | --- |
| Add to Tour snackbar shows View tour | PASS | From Listing Detail, tapping `Add to tour` showed `Added to tour draft` and `View tour` in the snackbar. Screenshot observed locally: `/home/bwilcox/Pictures/Screenshots/Screenshot_20260503_210759.png`; image not committed. | N/A |
| View tour opens Tour screen | PASS | Tapping `View tour` navigated to the Tour screen. | N/A |
| Local draft stop appears on Tour screen | PASS | Tour screen showed `1 stop in local draft` with the added listing stop. Screenshot observed locally: `/home/bwilcox/Pictures/Screenshots/Screenshot_20260503_210832.png`; image not committed. | N/A |
| Save tour / currentTour creation | PASS | Entering date `2026-05-03` enabled `Save tour`; tapping it showed a saved/current tour card: `Saved tour` / `Planned Tour · 1 stop`. Screenshots observed locally: `/home/bwilcox/Pictures/Screenshots/Screenshot_20260503_211155.png` and `/home/bwilcox/Pictures/Screenshots/Screenshot_20260503_211211.png`; images not committed. | N/A |
| Drive mode button appears | FAIL | After the saved/current tour card appeared, the tester did not see `Drive mode` on Pixel_6_API_36. ActiveTourScreen remained unreachable from the visible UI. | P1 major |
| Active Tour screen opens | SKIPPED / BLOCKED | Not run because `Drive mode` was not visible after Save Tour. | P1 major |
| Simulate approaching | SKIPPED / BLOCKED | Not run because Active Tour screen was not reached. | P1 major |
| Simulate arrived | SKIPPED / BLOCKED | Not run because Active Tour screen was not reached. | P1 major |
| Next / Previous / End | SKIPPED / BLOCKED | Not run because Active Tour screen was not reached. | P1 major |

## 7. Findings table

The original "no Tour screen path after Add to Tour" blocker is resolved by PR #63: the snackbar action opened `/tour` and the local draft stop was visible. Active-tour simulation is still blocked because `Drive mode` was not visible after a saved/current tour card appeared.

| ID | Severity | Area | Summary | Evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| QA-ACTIVE-TOUR-SMOKE-001 | N/A / resolved | Add-to-Tour navigation | PR #63 resolved the previous no-Tour-screen-path blocker. | `View tour` appeared in the Add-to-Tour snackbar, opened `/tour`, and Tour showed the local draft stop. | No follow-up needed for the Tour screen navigation affordance. |
| QA-ACTIVE-TOUR-SMOKE-004 | P1 major | Drive mode access | Drive mode was not visible after Save Tour created a saved/current tour card. | Saved/current card displayed `Saved tour` / `Planned Tour · 1 stop`, but tester reported `i dont see drive mode`. ActiveTourScreen and simulation controls were not reached. | Create a focused fix PR to make Drive mode visible/accessibly reachable on the saved/current tour card, then rerun ActiveTourScreen simulation QA. |
| QA-ACTIVE-TOUR-SMOKE-003 | P3 polish | Android runtime logs | Non-fatal startup jank logs were observed. | Terminal logs included skipped frames; app remained alive and no fatal red screen was reported. | Monitor runtime performance after core simulation access is fixed. |

## 8. Skipped items / limitations
- Active Tour screen baseline and controls were skipped because Drive mode was not visible after a saved/current tour card appeared.
- The original Add-to-Tour → Tour screen path was rerun and passed after PR #63.
- Save Tour/currentTour creation was rerun and passed in the available session.
- No real TTS/audio was expected or tested.
- No real GPS/geofencing was expected or tested.
- No maps/navigation/route polylines were expected or tested.
- No Android Auto behavior was expected or tested.
- No screenshot binaries were committed.

## 9. Recommended next action
- Create a focused fix PR for Drive mode visibility/accessibility on the saved/current tour card.
- After Drive mode is visible, rerun Android active-tour simulation QA for ActiveTourScreen baseline, Start, Simulate approaching, Simulate arrived, Next/Previous, and End.
- Do not start real TTS/geolocation/Android Auto work until the simulation path is reachable and accepted.

## 10. Scope confirmation
- No app/API/web/mobile source changes.
- No CI/package/lockfile/schema changes.
- No dependencies.
- No AndroidManifest changes.
- No native/platform code.
- No Android Auto.
- No real geofencing.
- No real GPS/location.
- No TTS playback.
- No maps/navigation/route polylines.
- No screenshots/binary files committed.
- No secrets committed.
