# Mobile Active Tour Simulation Smoke — 2026-05-03

## 1. Header
- Branch: `qa/mobile-active-tour-simulation-smoke`
- Commit tested: report updated after `dc53308 fix(mobile): make Drive mode visible on saved tour card (#64)`
- Date: 2026-05-03
- Mode: Android emulator active-tour simulation QA rerun
- Target: Pixel_6_API_36 / emulator-5554
- Epic status: Epic 16 simulation-only active-tour path; no native/location/audio scope

## 2. Context
- PR #57 added active-tour runtime state.
- PR #58 added narration loading/selection.
- PR #59 added the simulated proximity source.
- PR #60 wired the event source into the active-tour runtime.
- PR #61 added `/tour/drive/:tourId` and ActiveTourScreen.
- PR #63 added the `View tour` action to Add-to-Tour snackbars.
- PR #64 made the Drive mode action visible on the saved/current tour card.
- This report validates the Simulation-only Android path.
- Real TTS, GPS/geofencing, Android Auto, maps, route polylines, and navigation handoff were out of scope.

## 3. Environment
- Android emulator: Pixel_6_API_36 / emulator-5554
- API base URL: `http://10.0.2.2:3002`
- Supabase URL: `https://bmkqwfiipbxktrihydxd.supabase.co`
- `SUPABASE_ANON_KEY=***`
- `TENANT_ID=ac5caf15-572b-43d5-8b7f-943cbbb5134d`
- `/health`: 200 OK
- `/ready`: 200 OK
- `/api/brand`: 200 OK
- `/api/listings?limit=3`: 200 OK with listing results

## 4. Automated validation
- `flutter pub get`: passed, with known non-fatal advisory decode warnings.
- `flutter analyze`: passed.
- `flutter test`: passed.
- `flutter build apk --debug`: passed.

## 5. Manual QA checklist results

| Flow | Status | Evidence / notes | Severity if issue |
| --- | --- | --- | --- |
| App boot / brand bootstrap | PASS | App launched and showed Sign In / Welcome Back. No fatal Flutter red screen. | N/A |
| Signed-out Browse listings | PASS | Browse listings opened Search without signing in. | N/A |
| Search results | PASS | Search rendered 20 listings with cards. | N/A |
| Listing Detail | PASS | Tapping listing opened detail for `475 Northland Court NE`; detail content and Add to tour were visible. | N/A |
| Add to Tour | PASS | Add to Tour showed `Added to tour draft`. | N/A |
| View tour action | PASS | Snackbar included `View tour`; tapping it opened `/tour`. | N/A |
| Tour screen local draft | PASS | `/tour` showed `1 stop in local draft` with `475 Northland Court NE`. | N/A |
| Save tour / currentTour creation | PASS | Entering `2026-05-03` enabled Save tour; saved/current tour card appeared. | N/A |
| Drive mode entry | PASS | Saved/current tour card displayed visible `Drive mode`; tapping it opened Active Tour. | N/A |
| Active Tour screen baseline | PASS | Active Tour rendered status, tour title, stop 1 of 1, current stop, narration area, and controls. | N/A |
| Start control | PASS | Start changed status from ready to driving. | N/A |
| Simulate approaching | PASS | Simulate approaching changed status to narrating and showed `Approaching 475 Northland Court NE.` | N/A |
| Simulate arrived | PASS | Simulate arrived showed `Arrived at 475 Northland Court NE.` | N/A |
| Next / Previous | PASS | One-stop tour: Next changed status to finished, cleared narration, and left Previous/Next disabled; Previous could not move below first stop. | N/A |
| End control | PASS | End stayed stable while already finished. | N/A |
| TTS/audio | OUT_OF_SCOPE/FUTURE | Real audio/TTS was not expected or tested. | N/A |
| Map/navigation/GPS | OUT_OF_SCOPE/FUTURE | Maps, route polylines, navigation handoff, real GPS/geofencing, and Android Auto were not expected or tested. | N/A |

## 6. Findings table

No active P0/P1 blockers were found for the simulation-only one-stop active-tour path after PR #63 and PR #64.

| ID | Severity | Area | Summary | Evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| QA-ACTIVE-TOUR-SMOKE-001 | Resolved | Add-to-Tour navigation | PR #63 resolved the previous no-Tour-screen-path blocker. | `View tour` opened `/tour`, and Tour showed the local draft stop. | No follow-up needed for this affordance. |
| QA-ACTIVE-TOUR-SMOKE-004 | Resolved | Drive mode access | PR #64 resolved the previous Drive mode visibility blocker. | Saved/current tour card displayed visible `Drive mode`; tapping it opened Active Tour. | No follow-up needed for Drive mode visibility. |
| QA-ACTIVE-TOUR-SMOKE-005 | P3 polish | One-stop control state | One-stop tour exercised final-state behavior only. | Next on the only stop changed status to finished and disabled Previous/Next. | Optional future QA can repeat with a multi-stop persisted tour. |
| QA-ACTIVE-TOUR-SMOKE-003 | P3 polish | Android runtime logs | Non-fatal startup jank logs were observed. | App remained alive and no fatal Flutter red screen was reported. | Monitor in later Android QA passes. |

## 7. Skipped items / limitations
- Multi-stop movement was not fully exercised because the saved tour used one stop.
- Real TTS/audio was out of scope and not tested.
- Real GPS/geofencing was out of scope and not tested.
- Maps/navigation/route polylines were out of scope and not tested.
- Android Auto behavior was out of scope and not tested.
- No screenshot binaries were committed.

## 8. Recommended next action
- Treat the simulation-only one-stop active-tour Android path as QA-passed.
- Optionally run a multi-stop active-tour smoke before real TTS planning.
- Do not start real TTS/geolocation/Android Auto until simulation-path risk is accepted.

## 9. Scope confirmation
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
