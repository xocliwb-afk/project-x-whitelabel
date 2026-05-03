# Mobile Android Manual QA — 2026-05-03

## 1. Header
- Branch: `qa/mobile-android-manual-qa`
- Commit tested: `e43558c qa(mobile): validate Android emulator launch with config (#52)`
- Date: 2026-05-03
- Mode: Full Android emulator manual QA
- Target: Pixel_6_API_36 / emulator-5554
- Epic status: Epic 15 complete; Epic 16 not started

## 2. Environment
- Android SDK status: `flutter doctor` passed with no issues; Android SDK version 36.0.0.
- Emulator/device: Pixel_6_API_36, `emulator-5554`, Android API 36.
- API base URL: `http://10.0.2.2:3002`
- Supabase URL: `https://bmkqwfiipbxktrihydxd.supabase.co`
- `SUPABASE_ANON_KEY=***`
- `TENANT_ID=ac5caf15-572b-43d5-8b7f-943cbbb5134d`
- Local API `/health`: 200 OK.
- Local API `/ready`: 200 OK.
- Local API `/api/brand`: 200 OK with `x-tenant-id: ac5caf15-572b-43d5-8b7f-943cbbb5134d`.

## 3. Automated validation
- `flutter pub get`: passed. Non-fatal pub.dev advisory decode warnings were printed for hosted package advisory metadata.
- `flutter analyze`: passed, no issues found.
- `flutter test`: passed, all tests passed.
- `flutter build apk --debug`: passed; debug APK built successfully.

## 4. Runtime launch baseline
- App installed: yes.
- App launched: yes.
- First visible screen: Sign In screen with `Welcome Back`.
- Brand/bootstrap result: previous `Failed to load app configuration` error did not appear.
- Fatal crash: no visible fatal Flutter red screen observed.
- Runtime log notes: non-fatal startup/input jank logs were observed, including skipped frames and IME animation `JANK_COMPOSER` warnings.

## 5. Manual QA checklist results

| Flow | Status | Evidence / notes | Severity if issue |
| --- | --- | --- | --- |
| App boot / brand bootstrap | PASS | App installed and launched on Pixel_6_API_36 / `emulator-5554`. First visible screen was Sign In (`Welcome Back`). Previous app configuration error did not appear. No fatal Flutter red screen visible. Screenshot observed locally: `/home/bwilcox/Pictures/Screenshots/Screenshot_20260503_171855.png`; image not committed. | N/A |
| Create Account screen | PASS | Register link opened Create Account. Email, Password, Display Name, Phone, `Create Account`, and Sign In link were visible. No visible layout overflow or fatal red screen. Screenshot observed locally: `/home/bwilcox/Pictures/Screenshots/Screenshot_20260503_171953.png`; image not committed. | N/A |
| Login screen | PASS | Sign In screen rendered with Email, Password, `Sign In`, and Register link. Empty submit showed graceful validation: `Enter a valid email` and `At least 6 characters`. No visible fatal red screen. Screenshot observed locally: `/home/bwilcox/Pictures/Screenshots/Screenshot_20260503_172048.png`; image not committed. | N/A |
| Signed-out Search | SKIPPED | Signed-out UI did not expose a route to Search. User had to sign in before Search was reachable. | P1 major if public signed-out Search is intended |
| Signed-in Search | PASS | After signing in, Search rendered on the Android emulator with `20 listings shown`. | N/A |
| Search result rendering | PASS | Listing cards rendered with photos, prices, addresses, bed/bath/sqft facts, and status. No fatal Flutter red screen was observed. | N/A |
| Listing Detail | PASS | Tapped listing opened Listing Detail with hero image, price, address, facts, `Add to tour` button, and description. No fatal Flutter red screen was observed. | N/A |
| Add to Tour | PARTIAL / NOT FULLY RUN | `Add to tour` button was visible on the Listing Detail screen, but the resulting tour state was not fully validated. | ENV/setup |
| Tour screen | SKIPPED | Tour screen was not opened during this pass, so empty/local draft or added-listing state was not validated. | ENV/setup |
| Signed-in tour save | SKIPPED | Sign-in was used to reach Search/Detail, but persisted tour save was not tested. No credentials are recorded in this report. | ENV/setup |
| Logout/reset | SKIPPED | Logout/reset was not tested during this pass. | ENV/setup |
| API unavailable behavior | NOT RUN | Optional controlled API stop/restart test was not approved, so API was left running. | ENV/setup |

## 6. Findings table

| ID | Severity | Area | Summary | Evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| QA-ANDROID-MANUAL-001 | P1 major | Signed-out public navigation | Signed-out UI did not expose Search; user had to sign in before Search was reachable. | Observed auth screens did not provide Search navigation; Search was only reached after sign-in. | Confirm intended access model. If public signed-out Search is intended for Epic 15, create focused fix PR to expose Search without auth. |
| QA-ANDROID-MANUAL-002 | ENV/setup | Signed-in save/logout coverage | Signed-in tour save and logout/reset were skipped. | Sign-in was used to reach Search/Detail, but persisted tour save and logout/reset were not tested. No credentials are recorded in this report. | Provide approved test credentials and rerun signed-in tour save/logout QA. |
| QA-ANDROID-MANUAL-003 | P3 polish | Android runtime logs | Non-fatal startup/input jank logs were observed. | Terminal logs included skipped frames and IME animation `JANK_COMPOSER` warnings; app remained alive and no fatal Flutter red screen was visible. | Monitor startup/input performance after core functional QA is complete. |

## 7. Skipped items / limitations
- Signed-in tour save and logout/reset were skipped; no credentials are recorded in this report.
- Signed-out UI did not expose Search; Search was only observed after sign-in.
- Add to Tour result state was not fully validated.
- Tour screen was not opened during this pass.
- API unavailable behavior was not run because stopping the local API was not approved.
- Embedded map, route polylines, and navigation handoff were not expected in this QA pass and remain future/out-of-scope.
- No screenshot binaries were committed.

## 8. Recommended next action
- Confirm intended access model. If public signed-out Search is intended for Epic 15, create focused fix PR to expose Search without auth.
- Provide approved test credentials and rerun signed-in tour save and logout/reset QA.
- Complete Tour screen and Add to Tour state validation before accepting full Epic 15 mobile risk.
- Do not start Epic 16 until remaining mobile QA risk is accepted or rerun with approved credentials.

## 9. Scope confirmation
- No Epic 16 work performed.
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
