# Mobile Active Tour Multi-Stop Smoke — 2026-05-03

## 1. Header
- Branch: `qa/mobile-active-tour-multistop-smoke`
- Commit tested: `77d6fdf qa(mobile): validate active-tour simulation on Android (#62)`
- Date: 2026-05-03
- Mode: Android emulator multi-stop active-tour simulation QA
- Target: Pixel_6_API_36 / emulator-5554
- Epic status: Epic 16 simulation-only active-tour path; no native/location/audio scope

## 2. Context
- PR #62 confirmed the one-stop active-tour simulation path.
- This report validates multi-stop stop progression and repeated simulated narration.
- Real TTS, GPS/geofencing, Android Auto, maps, route polylines, and navigation handoff are out of scope.

## 3. Environment
- Android emulator: Pixel_6_API_36 / emulator-5554
- API base URL: `http://10.0.2.2:3002`
- Supabase URL: `https://bmkqwfiipbxktrihydxd.supabase.co`
- `SUPABASE_ANON_KEY=***`
- `TENANT_ID=ac5caf15-572b-43d5-8b7f-943cbbb5134d`
- `/health`: 200 OK
- `/ready`: 200 OK
- `/api/brand`: 200 OK
- `/api/listings?limit=5`: 200 OK with listing results

## 4. Automated validation
- `flutter pub get`: passed, with known non-fatal advisory decode warnings.
- `flutter analyze`: passed.
- `flutter test`: passed.
- `flutter build apk --debug`: passed.

## 5. Manual QA checklist results

| Flow | Status | Evidence / notes | Severity if issue |
| --- | --- | --- | --- |
| App boot / brand bootstrap | PASS | App launched on Pixel_6_API_36 / emulator-5554. No fatal red screen was reported. | N/A |
| Signed-out Search | PASS | Browse listings opened Search and listing cards rendered. | N/A |
| First listing Add to Tour | PASS | First listing detail opened, Add to Tour was visible, and Add to Tour showed the draft snackbar. | N/A |
| Second listing Add to Tour | PASS | A second different listing was opened and added; snackbar again showed Add-to-Tour feedback and View tour. | N/A |
| View tour opens Tour | PASS | Tapping View tour opened `/tour`. | N/A |
| Local draft shows multiple stops | PASS | Tour screen showed two stops in the local draft. | N/A |
| Save tour / currentTour creation | PASS | Save tour succeeded and created a saved/current tour card for two stops. | N/A |
| Drive mode entry | PASS | Drive mode was visible on the saved/current tour card and opened Active Tour. | N/A |
| Active Tour baseline | PASS | Active Tour opened in ready state with Stop 1 of 2, current stop, next stop, narration area, and controls. | N/A |
| Start control | PASS | Start changed status to driving and stayed stable. | N/A |
| Stop 1 simulate approaching | PASS | Simulate approaching updated status/narration for stop 1 and stayed stable. | N/A |
| Stop 1 simulate arrived | PASS | Simulate arrived updated arrived/fallback narration for stop 1 and stayed stable. | N/A |
| Next advances to Stop 2 | PASS | Next advanced the active tour to Stop 2 of 2 and changed the current stop. | N/A |
| Stop 2 simulate approaching | PASS | Simulate approaching updated narration for stop 2 and stayed stable. | N/A |
| Stop 2 simulate arrived | PASS | Simulate arrived updated arrived/fallback narration for stop 2 and stayed stable. | N/A |
| Previous returns to Stop 1 | PASS | Previous moved the active tour back to Stop 1 of 2. | N/A |
| Finish / End behavior | PASS | Next advanced back to Stop 2 and then finished the tour. End stayed stable with no fatal red screen. | N/A |
| TTS/audio | OUT_OF_SCOPE/FUTURE | Real audio/TTS not expected. | N/A |
| Map/navigation/GPS | OUT_OF_SCOPE/FUTURE | Maps, route polylines, navigation handoff, real GPS/geofencing, Android Auto not expected. | N/A |

## 6. Findings table

No active P0/P1 blockers were found for the multi-stop simulation-only active-tour path.

| ID | Severity | Area | Summary | Evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| QA-ACTIVE-TOUR-MULTISTOP-001 | P2 minor | Add-to-Tour snackbar action | A non-fatal Flutter gesture assertion was logged after using the Add-to-Tour snackbar action during the flow. | Console showed `_ListingDetailScreenState._addToTour` attempted to use `context` after unmount. The user-visible flow continued, View tour opened Tour, and no fatal red screen was reported. | Create a focused fix PR for the snackbar action context lifetime before release hardening. |
| QA-ACTIVE-TOUR-MULTISTOP-002 | P3 polish | Runtime logs | Non-fatal startup jank logs were observed. | Terminal logs included skipped frames; app remained usable and no fatal red screen was reported. | Monitor in later Android QA passes. |

## 7. Skipped items / limitations
- Real TTS/audio was out of scope and not tested.
- Real GPS/geofencing was out of scope and not tested.
- Maps/navigation/route polylines were out of scope and not tested.
- Android Auto behavior was out of scope and not tested.
- No screenshot binaries were committed.

## 8. Recommended next action
- Treat the multi-stop simulation-only active-tour Android path as QA-passed.
- Create a focused follow-up fix for the non-fatal Add-to-Tour snackbar context assertion.
- Move into real TTS planning only, not implementation, unless explicitly approved.

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
