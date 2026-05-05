# Mobile Map Search V1 Android Smoke QA - 2026-05-05

## 1. Status

PARTIAL PASS - Android emulator cold-boot QA, automated validation, app launch, map-search shell, list/detail, filters, sort, card selection, and signed-in favorite toggle smoke were validated. Real Mapbox rendering, price pins on a live map, native pin taps, camera-driven Search-this-area, and signed-out favorite prompt were not fully runtime-validated in this pass.

Epic 17.5 implementation PRs #74-#80 are merged. This QA closeout does not claim Epic 17 is complete. After Epic 17.5 closeout, the roadmap returns to Epic 17.

## 2. Build Under Test

- Branch: `qa/mobile-map-search-v1-closeout`
- Main commit tested: `421082f feat(mobile): add favorites and login prompt to map search`
- Epic: Epic 17.5 - Mobile Map Search V1
- QA type: Android emulator smoke plus docs/status closeout
- Debug APK path: `apps/mobile/build/app/outputs/flutter-apk/app-debug.apk`

## 3. Android Emulator Environment

- AVD: `Pixel_6_API_35`
- Device ID: `emulator-5554`
- Device model: `sdk_gphone64_x86_64`
- Android version/API: Android 15 / API 35
- ADB summary: `emulator-5554 device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emu64xa`
- Flutter summary: `sdk gphone64 x86 64 (mobile) - emulator-5554 - android-x64 - Android 15 (API 35) (emulator)`
- Emulator log path: `/tmp/projectx-mapsearch-emulator.log`

Cold boot command used:

```bash
setsid emulator -avd Pixel_6_API_35 -no-snapshot-load -netdelay none -netspeed full >/tmp/projectx-mapsearch-emulator.log 2>&1 &
```

Cold boot evidence:

- The command used `-no-snapshot-load`.
- The emulator log reported a full startup.
- Boot completed after ADB reported `sys.boot_completed=1`.
- No `-wipe-data` command was used.

## 4. Runtime Config

- Local API: already running on port `3002`.
- API health: PASS, `GET /health` returned HTTP 200.
- API ready: PASS, `GET /ready` returned HTTP 200.
- Brand endpoint: PASS, `GET /api/brand` with tenant header returned HTTP 200.
- Android API base URL used by Flutter: `http://10.0.2.2:3002`.
- `SUPABASE_URL`: present.
- `SUPABASE_ANON_KEY`: present, redacted.
- `TENANT_ID`: `ac5caf15-572b-43d5-8b7f-943cbbb5134d`.
- `MAPBOX_ACCESS_TOKEN`: missing in the local shell.

App run command shape used, with secrets supplied only through environment variables:

```bash
flutter run -d emulator-5554 --no-pub \
  --dart-define=API_BASE_URL="$API_BASE_URL" \
  --dart-define=SUPABASE_URL="$SUPABASE_URL" \
  --dart-define=SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  --dart-define=TENANT_ID="$TENANT_ID"
```

No `MAPBOX_ACCESS_TOKEN` dart define was passed because the token was not present.

## 5. Automated Validation

| Command | Result | Summary |
| --- | --- | --- |
| `pnpm --filter @project-x/api test` | PASS | `Test Files 22 passed (22)`; `Tests 208 passed (208)`. |
| `cd apps/mobile && flutter analyze` | PASS | `No issues found!` |
| `cd apps/mobile && flutter test` | PASS | `00:03 +132: All tests passed!` |
| `cd apps/mobile && flutter build apk --debug` | PASS | Built `build/app/outputs/flutter-apk/app-debug.apk`. |

Observed non-fatal validation noise:

- Vite emitted the existing CJS Node API deprecation warning during API tests.
- Flutter reported newer package versions are available; dependency resolution still succeeded.

## 6. Manual Android Smoke Checklist

| Area | Check | Result | Notes |
| --- | --- | --- | --- |
| Core launch/search | App cold-boots on Android emulator without crash. | PASS | App installed, launched, and stayed interactive; no fatal Flutter red screen observed. |
| Core launch/search | `/search` is reachable. | PASS | The app opened to the map-first search shell. |
| Core launch/search | Signed-out users can browse `/search`. | PARTIAL | Search is public by route design, but this AVD had an existing signed-in app session, so a clean signed-out runtime state was not proven. |
| Core launch/search | Missing-token placeholder appears safely if token absent. | PARTIAL | Placeholder text was present in the Android accessibility tree and app did not crash. On this viewport, the visible placeholder copy was largely obscured by the bottom results panel. |
| Core launch/search | Real Mapbox map renders if token present. | NOT RUN | `MAPBOX_ACCESS_TOKEN` was not present. |
| Core launch/search | Search input is visible. | PASS | Search field and submit affordance were visible. |
| Core launch/search | Sort control is visible. | PASS | Sort control was visible. |
| Core launch/search | Filter button is visible. | PASS | Filter button was visible. |
| Core launch/search | Bottom results panel is visible. | PASS | Results panel showed `20 listings shown` and listing cards. |
| Map behavior | Price pins render for listings with coordinates. | NOT RUN | Requires real Mapbox map/token. Covered by automated tests, not by runtime smoke. |
| Map behavior | Invalid/missing-coordinate listings do not crash map/pins. | NOT RUN | Requires real Mapbox map/token for runtime proof. Covered by automated tests. |
| Map behavior | Pin tap selects listing. | NOT RUN | Requires real Mapbox map/token. |
| Map behavior | Selected card/pin treatment is visible. | PARTIAL | Card selection was visible after tapping `Select on map`; selected pin treatment was not run without Mapbox. |
| Map behavior | Panning/zooming map triggers Search-this-area. | NOT RUN | Requires real Mapbox map/token. |
| Map behavior | Programmatic camera movement does not trigger false Search-this-area. | NOT RUN | Requires real Mapbox map/token. |
| Map behavior | Search-this-area commits a bbox search. | NOT RUN | Requires real Mapbox map/token. |
| List/search behavior | Listing cards render. | PASS | Cards rendered with images, prices, facts, Save home, Select on map, and Add to tour controls. |
| List/search behavior | Listing tap opens listing detail. | PASS | Tapping a card opened Listing Detail with image, price, facts, description, and Add to tour. |
| List/search behavior | Back navigation returns to search. | PASS | Android back returned from Listing Detail to the search shell. |
| List/search behavior | Refresh/retry states do not crash. | NOT RUN | No runtime error state was encountered. |
| List/search behavior | Load-more remains available when applicable. | PARTIAL | Long scrolling remained stable and additional cards rendered; an explicit load-more control was not reached in this smoke. |
| List/search behavior | Empty/error states remain safe. | NOT RUN | No empty or error state was encountered. |
| Filters/sort | Filter sheet opens. | PASS | Filter bottom sheet opened. |
| Filters/sort | Apply filter triggers a new search. | PASS | Applying a keyword filter closed the sheet and showed `Filters (1)` plus `1 filter active`. |
| Filters/sort | Reset clears filters. | PASS | Reset cleared the active filter indicator. |
| Filters/sort | Active filter indication appears. | PASS | `Filters (1)` and `1 filter active` appeared after applying a keyword filter. |
| Filters/sort | Sort change triggers a new search. | PASS | Changing sort to `Price: low to high` updated the sort label and reordered the visible cards. |
| Favorites | Signed-out heart tap shows `Log in to save this home.` | NOT RUN | This AVD had an existing signed-in app session, so the signed-out prompt was not observed. |
| Favorites | Signed-out heart tap does not visibly break browsing. | NOT RUN | Signed-out state was not available without clearing app data. |
| Favorites | Login prompt can be dismissed. | NOT RUN | Signed-out prompt was not observed. |
| Favorites | Signed-in favorite hydration/toggle. | PARTIAL | Existing signed-in session allowed a heart toggle to `Remove favorite`; the toggle was tapped again to restore `Save home`. No credentials were used or printed. |
| Regression/non-scope | No GPS/current-location permission prompt appears. | PASS | No permission prompt appeared. |
| Regression/non-scope | No geofence/TTS/narration behavior changed. | PASS | No geofence, TTS, or narration UI/permission behavior appeared in this search smoke. |
| Regression/non-scope | No Android Auto behavior changed. | PASS | No Android Auto behavior appeared in this search smoke. |
| Regression/non-scope | No saved-search UI appears. | PASS | No saved-search UI appeared. |
| Regression/non-scope | No lead-capture redesign appears. | PASS | No lead-capture UI appeared in this search smoke. |

## 7. Defects Found

No QA-blocking app defect was found in the validated path.

Non-blocking observations:

- `MAPBOX_ACCESS_TOKEN` was not available, so real Mapbox tiles, native annotations, pin taps, and camera-driven bbox behavior were not runtime-validated.
- The missing-token placeholder was present in the Android accessibility tree and the app remained stable, but the visible placeholder copy was mostly covered by the bottom results panel on the tested viewport.
- The AVD had an existing signed-in app session. That allowed a signed-in favorite toggle smoke, but prevented a clean signed-out login-prompt runtime check without clearing app data.

## 8. What Was Not Validated

- Real Mapbox tile rendering.
- Runtime price pins on a real Mapbox surface.
- Native Mapbox annotation tap behavior.
- Camera pan/zoom triggering Search-this-area.
- Search-this-area committing a real camera-derived bbox.
- Signed-out favorite login prompt on a clean signed-out runtime session.
- Signed-in favorite persistence using known QA credentials.
- Physical Android device behavior.
- Production-ready Mapbox token configuration.

## 9. Recommendation

READY TO CLOSE EPIC 17.5 IMPLEMENTATION WITH PARTIAL ANDROID RUNTIME QA LIMITATIONS.

Epic 17.5 implementation PRs #74-#80 are complete, automated validation is green, and Android emulator smoke validated the app launch, map-first shell, API-backed listings, detail handoff, filters, sort, card selection, and a partial favorite toggle path. Before production deployment, run a token-backed Android smoke with `MAPBOX_ACCESS_TOKEN` present and a clean signed-out session to validate real Mapbox rendering, native pins, camera-driven Search-this-area, and the signed-out favorite prompt.

Epic 17 remains incomplete. Next implementation work should return to Epic 17.
