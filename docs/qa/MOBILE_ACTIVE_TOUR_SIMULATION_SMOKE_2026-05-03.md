# Mobile Active Tour Simulation Smoke — 2026-05-03

## 1. Header
- Branch: `qa/mobile-active-tour-simulation-smoke`
- Commit tested: `5b0ee96 qa(mobile): update active-tour simulation smoke after View tour action`, rebased on `dc53308 fix(mobile): make Drive mode visible on saved tour card (#64)`
- Date: 2026-05-03
- Mode: Android emulator active-tour simulation QA rerun
- Target: Pixel_6_API_36 / emulator-5554
- Epic status: Epic 16 active-tour simulation, no native/location/audio scope

## 2. Context
- PR #57 added active-tour runtime state.
- PR #58 added narration loading/selection.
- PR #59 added simulated proximity source/direct handling.
- PR #60 wired event source to active-tour runtime.
- PR #61 added `/tour/drive/:tourId` and ActiveTourScreen.
- PR #63 added `View tour` actions to Add-to-Tour snackbars.
- PR #64 made Drive mode visible on the saved/current tour card.
- This QA validates the simulation-only runtime path after the navigation and Drive mode visibility fixes.
- No real TTS, GPS, geofencing, Android Auto, maps, route polylines, or navigation handoff was expected.

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
| App boot / brand bootstrap | PASS | App launched on Pixel_6_API_36 / `emulator-5554`. First visible screen was Sign In / `Welcome Back`. No fatal Flutter red screen. | N/A |
| Signed-out Browse listings | PASS | Tapping `Browse listings` opened Search without signing in. | N/A |
| Search results | PASS | Search rendered with `20 listings shown` and listing cards containing photos, prices, addresses, bed/bath/sqft/status, and days on market. | N/A |
| Listing Detail | PASS | Tapping a listing opened Listing Detail for `475 Northland Court NE`. Hero image, price, address, status, facts, description, and `Add to tour` button were visible. | N/A |
| Add to Tour | PASS | Tapping `Add to tour` showed snackbar text `Added to tour draft`. | N/A |
| View tour action | PASS | Snackbar included `View tour`; tapping it opened `/tour`. | N/A |
| Tour screen local draft | PASS | Tour screen opened and showed `1 stop in local draft` with `475 Northland Court NE`. Date/start-time/save controls were visible. | N/A |
| Save tour / currentTour creation | PASS | Entering `2026-05-03` enabled `Save tour`; tapping it showed a saved/current tour card: `Saved tour` / `Planned Tour · 1 stop`. | N/A |
| Drive mode entry | PASS | After PR #64, the saved/current tour card displayed a high-contrast `Drive mode` action. Tapping it opened Active Tour. | N/A |
| Active Tour screen baseline | PASS | Active Tour screen rendered title `Active Tour`, status `ready`, `Planned Tour`, `Stop 1 of 1`, current stop `475 Northland Court NE`, narration area, and controls. | N/A |
| Start control | PASS | Tapping `Start` changed status from `ready` to `driving`; no fatal red screen. | N/A |
| Simulate approaching | PASS | Tapping `Simulate approaching` changed status to `narrating` and showed fallback narration: `Approaching 475 Northland Court NE.` | N/A |
| Simulate arrived | PASS | Tapping `Simulate arrived` kept status `narrating` and showed fallback narration: `Arrived at 475 Northland Court NE.` | N/A |
| Next / Previous | PASS | One-stop tour: tapping `Next` changed status to `finished`, cleared narration, and left Previous/Next disabled. Previous could not move below first stop. | N/A |
| End control | PASS | Tapping `End` while already finished stayed stable on Active Tour with no fatal red screen. | N/A |
| TTS/audio | OUT_OF_SCOPE/FUTURE | Real audio/TTS was not expected or tested in this pass. | N/A |
| Map/navigation/GPS | OUT_OF_SCOPE/FUTURE | Maps, route polylines, navigation handoff, real GPS/geofencing, and Android Auto were not expected or tested. | N/A |

## 6. Rerun after PR #63/#64
- PR #63 resolved the Add-to-Tour to Tour navigation blocker by adding `View tour` to Add-to-Tour snackbars.
- PR #64 resolved the Drive mode visibility blocker by making `Drive mode` prominent and high contrast on the saved/current tour card.
- Rerun date: 2026-05-03.
- Device: Pixel_6_API_36 / `emulator-5554`.
- Local API validation: `/health`, `/ready`, `/api/brand`, and `/api/listings?limit=3` returned 200 OK.
- Automated validation passed: `flutter pub get`, `flutter analyze`, `flutter test`, and `flutter build apk --debug`.
- Runtime launch: app launched with runtime config and rendered Sign In first. No fatal Flutter red screen was visible.

| Flow | Status | Evidence / notes | Severity if issue |
| --- | --- | --- | --- |
| Add to Tour snackbar shows View tour | PASS | From Listing Detail, tapping `Add to tour` showed `Added to tour draft` and `View tour` in the snackbar. | N/A |
| View tour opens Tour screen | PASS | Tapping `View tour` navigated to the Tour screen. | N/A |
| Local draft stop appears on Tour screen | PASS | Tour screen showed `1 stop in local draft` with `475 Northland Court NE`. | N/A |
| Save tour / currentTour creation | PASS | Entering date `2026-05-03` enabled `Save tour`; tapping it showed `Saved tour` / `Planned Tour · 1 stop`. | N/A |
| Drive mode button appears | PASS | Saved/current tour card displayed visible `Drive mode` action after PR #64. | N/A |
| Active Tour screen opens | PASS | Tapping `Drive mode` opened Active Tour with runtime status, current stop, narration, and controls. | N/A |
| Simulate approaching | PASS | Simulated approaching event selected fallback narration text and changed status to `narrating`. | N/A |
| Simulate arrived | PASS | Simulated arrived event selected fallback narration text and kept status `narrating`. | N/A |
| Next / Previous / End | PASS | One-stop tour final-stop behavior and end-state stability were confirmed. | N/A |

## 7. Findings table

No active P0/P1 blockers were found for the simulation-only active-tour path after PR #63 and PR #64.

| ID | Severity | Area | Summary | Evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| QA-ACTIVE-TOUR-SMOKE-001 | Resolved | Add-to-Tour navigation | PR #63 resolved the previous no-Tour-screen-path blocker. | `View tour` appeared in the Add-to-Tour snackbar, opened `/tour`, and Tour showed the local draft stop. | No follow-up needed for the Tour screen navigation affordance. |
| QA-ACTIVE-TOUR-SMOKE-004 | Resolved | Drive mode access | PR #64 resolved the previous Drive mode visibility blocker. | Saved/current tour card displayed visible `Drive mode`; tapping it opened Active Tour. | No follow-up needed for Drive mode visibility. |
| QA-ACTIVE-TOUR-SMOKE-005 | P3 polish | One-stop control state | On a one-stop tour, Previous/Next become disabled after finishing, which is correct but leaves simulation focused on single-stop final-state behavior. | `Next` on the only stop changed status to `finished`, cleared narration, and disabled Previous/Next. | Optional future QA can repeat with a multi-stop persisted tour to exercise forward/back movement between stops. |
| QA-ACTIVE-TOUR-SMOKE-003 | P3 polish | Android runtime logs | Non-fatal startup jank logs were observed. | Terminal logs included skipped frames; app remained alive and no fatal red screen was reported. | Monitor runtime performance in later Android QA passes. |

## 8. Skipped items / limitations
- Multi-stop movement was not fully exercised because the saved tour used one stop.
- Real TTS/audio was out of scope and not tested.
- Real GPS/geofencing was out of scope and not tested.
- Maps/navigation/route polylines were out of scope and not tested.
- Android Auto behavior was out of scope and not tested.
- No screenshot binaries were committed.

## 9. Recommended next action
- Treat the simulation-only active-tour Android path as QA-passed for the one-stop smoke scenario.
- Optionally run a separate multi-stop smoke pass before moving into real TTS planning.
- Do not start real TTS/geolocation/Android Auto work until the simulation path is accepted.

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
