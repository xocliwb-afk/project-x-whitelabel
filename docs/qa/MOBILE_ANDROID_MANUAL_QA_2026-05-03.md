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
| Signed-out Search | SKIPPED | User confirmed there is no way to get to Search from the signed-out UI without signing in. No deep-link-only route was used for this manual pass. | P1 major if signed-out Search is intended to be reachable from current UI |
| Search result rendering | SKIPPED | Blocked because Search was not reachable from the signed-out UI and no approved signed-in test credentials were available. | ENV/setup |
| Listing Detail | SKIPPED | Blocked because Search/listing results were not reachable from the signed-out UI and no approved signed-in test credentials were available. | ENV/setup |
| Add to Tour | SKIPPED | Blocked because Search/Detail were not reachable from the signed-out UI and no approved signed-in test credentials were available. | ENV/setup |
| Tour screen | SKIPPED | Blocked because Tour was not reachable from the signed-out UI and no approved signed-in test credentials were available. | ENV/setup |
| Signed-in tour save | SKIPPED | No approved test credentials were available; no real user was created and no real credentials were used. | ENV/setup |
| Logout/reset | SKIPPED | No signed-in test account was available. | ENV/setup |
| API unavailable behavior | NOT RUN | Optional controlled API stop/restart test was not approved, so API was left running. | ENV/setup |

## 6. Findings table

| ID | Severity | Area | Summary | Evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| QA-ANDROID-MANUAL-001 | P1 major | Signed-out public navigation | Signed-out UI did not expose a path to Search, so Search → Detail → Add to Tour → Tour could not be manually validated from the observed auth screens. | User confirmed there was no way to get to Search without signing in after the Sign In/Create Account checkpoints. | Confirm intended access model. If signed-out Search is intended for Epic 15, create a focused fix PR. If auth-gated, provide approved test credentials and rerun manual QA. |
| QA-ANDROID-MANUAL-002 | ENV/setup | Test credentials | Signed-in flows were skipped because no approved test credentials were available. | Login/register screens were validated, but no real registration was submitted and no real credentials were used. | Provide approved test credentials and rerun signed-in Search/Tour save/logout QA. |
| QA-ANDROID-MANUAL-003 | P3 polish | Android runtime logs | Non-fatal startup/input jank logs were observed. | Terminal logs included skipped frames and IME animation `JANK_COMPOSER` warnings; app remained alive and no fatal Flutter red screen was visible. | Monitor startup/input performance after core functional QA is complete. |

## 7. Skipped items / limitations
- Missing approved test credentials prevented signed-in Search, Tour save, and logout/reset QA.
- Signed-out UI did not expose Search from the observed Sign In/Create Account surfaces.
- Search result rendering, Listing Detail, Add to Tour, and Tour screen were skipped because the route was not reachable from signed-out UI and no approved signed-in credentials were available.
- API unavailable behavior was not run because stopping the local API was not approved.
- No screenshot binaries were committed.

## 8. Recommended next action
- Treat `QA-ANDROID-MANUAL-001` as the key pre-Epic 16 decision point: either confirm Search/Tour are intentionally auth-gated, or create a focused fix PR to expose the intended public route.
- Provide approved test credentials and rerun auth/search/detail/tour-save/logout QA.
- Do not start Epic 16 until the signed-out Search access risk is accepted or resolved and signed-in flow risk is accepted or rerun with approved credentials.

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
