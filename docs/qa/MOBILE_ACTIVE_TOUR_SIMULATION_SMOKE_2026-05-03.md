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

## 6. Findings table

| ID | Severity | Area | Summary | Evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| QA-ACTIVE-TOUR-SMOKE-001 | P1 major | Drive mode access | Active-tour simulation could not be manually validated because the observed Add-to-Tour flow did not expose a Tour screen or Drive mode path. | Search and Listing Detail rendered; `Add to tour` was visible and user confirmed it worked, but user also confirmed `no tour path screen`. | Create a focused fix PR to expose an appropriate Tour/Drive mode path after Add to Tour, or provide a reliable saved/current tour setup for QA. |
| QA-ACTIVE-TOUR-SMOKE-002 | ENV/setup | Persisted/current tour setup | This pass did not validate a signed-in persisted/current tour card. | Drive mode exists on saved/current tour cards, but the observed signed-out/local Add-to-Tour path did not surface one. | Provide approved signed-in test credentials or a seeded saved/current tour path, then rerun Drive mode QA. |
| QA-ACTIVE-TOUR-SMOKE-003 | P3 polish | Android runtime logs | Non-fatal startup jank logs were observed. | Terminal logs included skipped frames; app remained alive and no fatal red screen was reported. | Monitor runtime performance after core simulation access is fixed. |

## 7. Skipped items / limitations
- Active Tour screen baseline and controls were skipped because Drive mode was not reachable from the observed UI flow.
- The signed-in persisted/current tour path was not tested in this pass.
- Add-to-Tour resulting state was not fully captured beyond user confirmation that the button worked and the app stayed stable.
- No real TTS/audio was expected or tested.
- No real GPS/geofencing was expected or tested.
- No maps/navigation/route polylines were expected or tested.
- No Android Auto behavior was expected or tested.
- No screenshot binaries were committed.

## 8. Recommended next action
- If Drive mode is expected to be reachable from the Search → Detail → Add to Tour flow, create a focused fix PR to expose the Tour/Drive mode path.
- If Drive mode requires a persisted/current saved tour, provide approved signed-in test credentials or a seeded current tour and rerun Android active-tour simulation QA.
- Do not start real TTS/geolocation/Android Auto work until the simulation path is reachable and accepted.

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
