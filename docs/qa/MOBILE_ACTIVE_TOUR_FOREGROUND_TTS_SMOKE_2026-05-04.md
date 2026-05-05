# Mobile Active Tour Foreground TTS Smoke QA — 2026-05-04

## 1. Status

PARTIAL PASS — automated validation and emulator runtime smoke validated, physical audible playback not validated

The Android emulator runtime path was completed on the already-running GUI emulator `emulator-5554` using Android 15/API 35. Automated validation passed, the app installed and launched, the active-tour flow was reached, simulation controls worked, foreground TTS status changed, and Android TTS logs showed utterance start/complete/stop events.

Audible speech was not heard on the emulator, and physical Android audible playback was not run. Production-ready audible playback is not claimed.

## 2. Scope

- Epic 17 foreground TTS narration only.
- Active-tour simulation path only.
- Android emulator runtime QA.
- No GPS/geofencing.
- No Android Auto.
- No maps/navigation/route polylines.
- No background narration.
- No foreground service.

## 3. Build under test

- Branch: `qa/mobile-active-tour-foreground-tts-smoke`
- Latest main commit before QA branch: `26b0bde feat(mobile): add active-tour audio controls (#70)`
- Relevant merged PRs:
  - `a810172 docs(epic-17): freeze mobile foreground TTS contract (#66)`
  - `4191735 chore(mobile): add TTS engine provider plumbing (#67)`
  - `7d8ab73 feat(mobile): add Flutter TTS engine behind TtsEngine (#68)`
  - `4b37f21 feat(mobile): speak active-tour narration in foreground (#69)`
  - `26b0bde feat(mobile): add active-tour audio controls (#70)`
- Debug APK path: `apps/mobile/build/app/outputs/flutter-apk/app-debug.apk`

## 4. Automated validation

| Command | Result | Raw summary |
| --- | --- | --- |
| `flutter pub get` | PASS | `Got dependencies!`; `57 packages have newer versions incompatible with dependency constraints.` |
| `flutter analyze` | PASS | `No issues found! (ran in 0.8s)` |
| `flutter test` | PASS | `00:02 +101: All tests passed!` |
| `flutter build apk --debug` | PASS | `Built build/app/outputs/flutter-apk/app-debug.apk` |

The newer-version advisory output was observed during dependency resolution and was non-fatal.

## 5. Local API and runtime config

- Local API port `3002`: PASS.
- API listener: `node-22` listening on `*:3002`.
- API status for this pass: already running; not started by this pass.
- `GET /health`: PASS, `HTTP/1.1 200 OK`.
- `GET /ready`: PASS, `HTTP/1.1 200 OK`.
- `GET /api/brand` with tenant header: PASS, `HTTP/1.1 200 OK`.
- API base URL used by Flutter for Android emulator: `http://10.0.2.2:3002`.
- `SUPABASE_URL`: PRESENT, `https://bmkqwfiipbxktrihydxd.supabase.co`.
- `SUPABASE_ANON_KEY`: PRESENT, redacted.
- `TENANT_ID`: `ac5caf15-572b-43d5-8b7f-943cbbb5134d`.

## 6. Emulator/device environment

- Emulator id: `emulator-5554`.
- Device summary: `sdk gphone64 x86 64`, model `sdk_gphone64_x86_64`.
- Android version/API: Android 15/API 35.
- `adb devices -l`: `emulator-5554 device product:sdk_gphone64_x86_64 model:sdk_gphone64_x86_64 device:emu64xa`.
- `flutter devices`: `sdk gphone64 x86 64 (mobile) • emulator-5554 • android-x64 • Android 15 (API 35) (emulator)`, plus Linux desktop and Chrome.
- Install/run result: PASS. `flutter run -d emulator-5554` built, installed, launched `lib/main.dart`, and exposed a Dart VM Service.
- App launched: PASS.
- Flutter run was detached after manual QA; no source files were changed.

## 7. Smoke path tested

| Step | Expected | Result | Notes |
| --- | --- | --- | --- |
| App launch | App launches on Android with no fatal Flutter red screen. | PASS | Tester reported pass. |
| Browse listings | Browse listings opens Search from auth entry if needed. | PASS | Tester reported Search was open and running. |
| Search results | Listings render with no fatal error. | PASS | Tester reported pass. |
| Listing detail | Tapping a listing opens detail with listing facts/details. | PASS | Tester reported pass. |
| Add to Tour | Add to Tour works and shows View tour when available. | PASS | Tester reported pass. |
| View tour/open tour | View tour or Tour navigation opens the tour screen. | PASS | Tester reported pass. |
| Save/current tour | Saved/current tour card appears after required tour details. | PASS | Tester reported pass. |
| Drive mode | Drive mode opens the active-tour experience. | PASS | Tester reported pass. |
| Active Tour open | Active Tour opens with ready state and controls. | PASS | Tester observed `ready`; Start, Previous, and Next visible. |
| Start | Start changes the tour to driving/active state. | PASS | Tester reported pass. |
| Simulate approaching | Approaching simulation triggers foreground narration state. | PASS | Tester saw `audio: speaking`; Android logs showed TTS utterance start/complete. No audible emulator audio was heard. |
| Narration text visible | Narration text should be visible during simulation. | FOLLOW-UP | Tester did not clearly see separate narration text beyond `audio: speaking`; tracked as a non-blocking QA observation. |
| Audio status visible | Audio status appears when narration/playback is active. | PASS | `audio: speaking` was visible. |
| Simulate arrived | Arrived simulation updates foreground narration state. | PASS | Tester reported same behavior as approaching: `audio: speaking`, no audible emulator audio. |
| Stop narration | Stop narration changes status and stops speech if audible. | PASS | Tester reported status changed to stopped; no audio was heard during the test. Logs showed a TTS utterance stopped/interrupted event. |
| Replay narration | Replay triggers current narration/status again. | PASS | Tester reported status changed; no audible emulator audio. Logs showed TTS utterance events. |
| Next/Previous | Next and Previous still work and app remains stable. | PASS | Tester reported pass. |
| Finish/End | End/Finish exits active tour cleanly with no crash. | PASS | Tester reported pass. |
| App pause/background stop | Backgrounding behaves safely and no audio continues unexpectedly. | PASS | Tester reported pass. No unexpected audio was heard. |

## 8. Physical Android audible playback

- Status: NOT RUN
- Device used: none
- Audible approaching narration result: NOT RUN
- Audible arrived narration result: NOT RUN
- Stop audible behavior: NOT RUN
- Replay audible behavior: NOT RUN
- Background/pause audible behavior: NOT RUN

Physical Android audible playback was not validated in this PR. Production-ready audible playback is not claimed.

## 9. Findings

Blockers:

- None for the docs-only implementation closeout. Physical Android audible playback remains required before claiming production-ready audible playback.

Non-blocking issues:

- Emulator UI reported `audio: speaking` and Android TTS logs showed utterance start/complete/stop events, but the tester did not hear audio from the emulator. This may be emulator audio configuration rather than an app issue; physical Android QA is required to decide.
- The tester did not observe separate narration text during approaching/arrived simulation, only `audio: speaking`. This should be reviewed before treating visible narration copy as fully validated.

Observations:

- Emulator QA validated app install, launch, API connectivity, listing browse/detail flow, add-to-tour flow, active-tour navigation, simulation controls, audio status state, stop/replay controls, Next/Previous, Finish/End, and safe background behavior.
- Emulator QA can prove wiring/state/UI and may prove emulator TTS engine events when logs show utterance callbacks.
- Emulator QA did not prove real audible playback.
- Physical Android remains required before a production-ready audible playback claim.

## 10. Scope confirmation

- Docs-only PR.
- No source code changed.
- No package/lockfile changed.
- No AndroidManifest changed.
- No API/web/packages/CI/database changed.
- No Android Auto/GPS/geofencing/maps/navigation/background service work added.

## 11. Recommendation

READY TO CLOSE IMPLEMENTATION, PHYSICAL AUDIO QA STILL REQUIRED

Epic 17 foreground TTS implementation is validated through automated checks and Android emulator runtime smoke for wiring, state, controls, and TTS callback activity. Physical Android audible playback is still required before closing the Epic as production-ready audible narration.
