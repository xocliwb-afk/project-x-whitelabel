# Mobile Android Runtime Launch With Config — 2026-05-03

## 1. Header
- Branch: `qa/mobile-android-runtime-launch-with-config`
- Commit tested: `18be3a4 qa(mobile): add Android emulator launch smoke report (#50)`
- Date: 2026-05-03
- Mode: Android emulator runtime launch smoke with real runtime config
- Epic status: Epic 15 complete; Epic 16 not started

## 2. Local API/database connectivity
- `/health`: 200 OK
- `/ready`: 200 OK
- `/api/brand`: 200 OK with `x-tenant-id: ac5caf15-572b-43d5-8b7f-943cbbb5134d`
- Local API DB connectivity fixed by switching `apps/api/.env` `DATABASE_URL` to Supabase Session Pooler.
- Do not include full DATABASE_URL.
- Session Pooler host only: `aws-1-us-east-1.pooler.supabase.com`
- Direct DB host that previously failed: `db.bmkqwfiipbxktrihydxd.supabase.co:5432`

## 3. Runtime config used
- `API_BASE_URL=http://10.0.2.2:3002`
- `SUPABASE_URL=https://bmkqwfiipbxktrihydxd.supabase.co`
- `SUPABASE_ANON_KEY=***`
- `TENANT_ID=ac5caf15-572b-43d5-8b7f-943cbbb5134d`

## 4. Android toolchain/device
- Android SDK installed locally
- JDK 21 via `JAVA_HOME=/usr/lib/jvm/java-21-openjdk`
- AVD: `Pixel_6_API_36`
- Device ID: `emulator-5554`
- Android API: 36
- `flutter build apk --debug`: passed from prior smoke
- `flutter run -d emulator-5554`: attempted

## 5. Android runtime launch result
- App installed: yes
- App launched: yes
- First visible screen: Create Account
- Brand/bootstrap result: previous app configuration error disappeared
- Fatal crash observed: no
- Initial app state: unauthenticated auth/register screen
- Screenshot evidence: screenshot was observed locally; binary image is not embedded because it was not already committed or approved.

## 6. Findings table

| ID | Severity | Area | Summary | Evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| QA-ANDROID-CONFIG-001 | ENV/setup | Local API/database connectivity | RESOLVED: Local API brand config 500 fixed by Session Pooler. | `/api/brand` returned 200 with `x-tenant-id: ac5caf15-572b-43d5-8b7f-943cbbb5134d` after switching local `apps/api/.env` `DATABASE_URL` to Supabase Session Pooler. | Keep local API database configuration on the Session Pooler path for emulator runtime smoke tests. |
| QA-ANDROID-LAUNCH-001 | none | Android runtime launch | PASS/no P0/P1 blocker: Android app launches to Create Account screen with runtime config. | `Pixel_6_API_36` was visible as `emulator-5554`; `flutter run -d emulator-5554` was attempted with runtime Dart defines; app installed and launched without the previous app configuration error or visible fatal crash. | Run full Android manual QA next. |
| QA-ANDROID-MANUAL-001 | OUT_OF_SCOPE/FUTURE | Full Android manual QA | Full manual QA was not run as part of this docs-only runtime launch report. | This report only documents the successful emulator launch smoke with real runtime config. | Complete full Android manual QA before starting Epic 16 unless risk is explicitly accepted. |

## 7. Recommended next action
- Run full Android manual QA next.
- Test login/register only with approved test credentials.
- Test `/search`, `/listing/:id`, `/tour`, Search → Detail → Add to Tour → Tour.
- Do not start Epic 16 until full Android manual QA is completed or risk is explicitly accepted.

## 8. Scope confirmation
- No Epic 16 work performed.
- No Android Auto implementation.
- No geofencing.
- No TTS playback.
- No platform channels.
- No native services.
- No maps/navigation work.
- No app/API/web/CI/package/schema changes.
- No bug fixes.
- No secrets committed.
