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
| Signed-out Search | PASS | Search screen rendered on the Android emulator without approved test credentials. It displayed `20 listings shown` and listing cards. | N/A |
| Search result rendering | PASS | Listing cards rendered with photos, prices, addresses, bed/bath/sqft facts, and status. No fatal Flutter red screen was observed. | N/A |
| Listing Detail | PASS | Listing Detail rendered from a listing with hero image, price, address, status, beds/baths/sqft/year/type facts, `Add to tour` button, and description. No fatal Flutter red screen was observed. | N/A |
| Add to Tour | PARTIAL / NOT FULLY RUN | `Add to tour` button was visible on the Listing Detail screen, but the resulting tour state was not fully validated. | ENV/setup |
| Tour screen | SKIPPED | Tour screen was not opened during this pass, so empty/local draft or added-listing state was not validated. | ENV/setup |
| Signed-in tour save | SKIPPED | No approved test credentials were available; no real user was created and no real credentials were used. | ENV/setup |
| Logout/reset | SKIPPED | No signed-in test account was available. | ENV/setup |
| API unavailable behavior | NOT RUN | Optional controlled API stop/restart test was not approved, so API was left running. | ENV/setup |

## 6. Findings table

| ID | Severity | Area | Summary | Evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| QA-ANDROID-MANUAL-001 | P2 minor | Mobile navigation model | No obvious bottom/tab navigation was exposed from the auth screens; Search was observed, but the intended navigation model needs confirmation. | Sign In and Create Account screens rendered; Search and Listing Detail were also observed during the emulator QA pass. | Confirm the intended mobile navigation model between auth screens and public Search/Tour surfaces. |
| QA-ANDROID-MANUAL-002 | ENV/setup | Test credentials | Signed-in flows were skipped because no approved test credentials were available. | Login/register screens were validated, but no real registration was submitted and no real credentials were used. | Provide approved test credentials and rerun signed-in Search/Tour save/logout QA. |
| QA-ANDROID-MANUAL-003 | P3 polish | Android runtime logs | Non-fatal startup/input jank logs were observed. | Terminal logs included skipped frames and IME animation `JANK_COMPOSER` warnings; app remained alive and no fatal Flutter red screen was visible. | Monitor startup/input performance after core functional QA is complete. |

## 7. Skipped items / limitations
- Missing approved test credentials prevented signed-in tour save and logout/reset QA.
- The intended navigation model from auth screens to public Search/Tour surfaces needs confirmation.
- Add to Tour was only partially validated: the button was visible on Listing Detail, but resulting tour state was not fully validated.
- Tour screen was not opened during this pass.
- API unavailable behavior was not run because stopping the local API was not approved.
- No map was visible; embedded map, route polylines, and navigation handoff were not expected in this QA pass and remain future/out-of-scope.
- No screenshot binaries were committed.

## 8. Recommended next action
- Confirm the intended mobile navigation model between auth screens and public Search/Tour surfaces.
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
