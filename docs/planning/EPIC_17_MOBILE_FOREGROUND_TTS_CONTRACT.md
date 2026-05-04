# Epic 17 — Mobile Foreground TTS Narration Contract

## 1. Status

- This is the planning contract for Epic 17 mobile foreground TTS work.
- Epic 16 simulation-only active-tour path is QA-passed.
- Foreground TTS playback is the next approved scope.
- This document freezes behavior before code implementation begins.
- This contract supersedes any older broad interpretation of Epic 17 as Android Auto, real GPS, or geofencing work.

## 2. Current repo truth

- `TtsEngine` and `NoOpTtsEngine` exist in `apps/mobile/lib/services/narration_service.dart`.
- `NoOpTtsEngine` is a placeholder. It toggles an in-memory speaking flag and does not produce real audio.
- `ActiveTourController` selects narration text but does not call any TTS engine.
- `ActiveTourState` already has `currentNarrationText` and `ActiveTourPlaybackStatus`.
- `ActiveTourScreen` displays the selected narration text.
- Simulated proximity events trigger active-tour narration text through `ActiveTourController.handleProximityEvent()`.
- One-stop and multi-stop active-tour simulation passed Android emulator QA.
- `apps/mobile/pubspec.yaml` does not include `flutter_tts`, `geolocator`, `permission_handler`, `audio_session`, or another audio focus dependency.
- `apps/mobile/android/app/src/main/AndroidManifest.xml` currently has no TTS service query, audio permissions, foreground service, location permissions, Android Auto declarations, or app-authored platform channel declarations.
- Real TTS/audio, real GPS/geofencing, Android Auto, maps, route polylines, and navigation handoff remain unimplemented.
- Multi-stop Android QA recorded a deferred P2 non-fatal Add-to-Tour snackbar context assertion. It is not part of Epic 17 unless it blocks TTS QA.

## 3. Epic 17 MVP scope

In scope for the Epic 17 MVP:

- Foreground-only real TTS playback for active-tour narration.
- `FlutterTtsEngine` behind the existing `TtsEngine` app boundary.
- Provider boundary for `TtsEngine`.
- Controller wiring so selected active-tour narration speaks.
- Stop narration control.
- Replay/manual narration support if it stays low risk.
- TTS unavailable and TTS error handling.
- Foreground lifecycle stop when the app pauses or backgrounds.
- Fake TTS engine for unit and widget tests.
- Android emulator QA.
- Physical Android device QA before claiming production-ready audible playback.

## 4. Explicit non-scope

Out of scope unless separately approved:

- Android Auto.
- Real GPS or geofencing.
- `geolocator`.
- Location permissions.
- Foreground service.
- Background narration.
- Notification channel.
- Native Android service.
- Platform channels authored by this app.
- Maps, navigation, route polylines, or navigation handoff.
- Audio focus hardening or audio ducking beyond plugin defaults.
- `audio_session` dependency in the first TTS slice.
- iOS-specific implementation or QA.
- Release signing.
- Broad UI redesign.
- Add-to-Tour snackbar context assertion fix.

## 5. Plugin decision

- Recommended plugin: `flutter_tts`.
- Current planning research found `flutter_tts` `4.2.5` on pub.dev.
- The implementation PR must verify the current latest compatible version before editing `apps/mobile/pubspec.yaml`.
- `flutter_tts` documents Android minimum SDK 21.
- Android 11+ TTS package visibility may require a manifest `<queries>` entry for `android.intent.action.TTS_SERVICE`.
- No runtime permissions are expected for foreground TTS playback.
- This contract does not add the dependency. It freezes the recommendation, checks, and stop conditions for later implementation.

## 6. TTS architecture

- `TtsEngine` remains the app-level boundary.
- Add `ttsEngineProvider`.
- A later production implementation should add `FlutterTtsEngine`.
- Tests use `FakeTtsEngine`.
- `ActiveTourController` receives `TtsEngine` by injection.
- `ActiveTourController` must not import `flutter_tts`.
- `ActiveTourScreen` must not know about `flutter_tts`.
- TTS behavior should be owned by the runtime/controller layer, not by button callbacks or widget-local plugin calls.
- The UI-visible narration text remains available whether or not speech succeeds.

## 7. Interface decision

Fallback narration can currently exist as text without a matching `NarrationPayload`. Epic 17 must support speaking that fallback text.

Required interface direction:

- Keep `speak(NarrationPayload payload)` for payload-backed narration, and add `speakText(String text)`.
- Or replace both with a small `TtsSpeechRequest` value object that can represent payload-backed and fallback text.

Implementation guidance:

- The implementation PR must choose one of these shapes and document why.
- The chosen shape must let fallback text play without inventing incomplete or misleading payload fields.
- UI-visible narration text remains the source of truth even if TTS fails.
- TTS failure must not clear the visible narration text.

## 8. Playback behavior

- Simulated `approaching` and `arrived` events auto-play narration while the app is foregrounded.
- New narration interrupts previous narration.
- Before speaking new text, stop or flush the previous utterance.
- `clearNarration()` should stop active speech.
- `advance()` should stop active speech before clearing current narration.
- `previous()` should stop active speech before clearing current narration.
- `end()` should stop active speech and enter the existing finished state.
- `reset()` should stop active speech and clear active-tour state.
- Controller `dispose()` should stop active speech and cancel subscriptions.
- Stop narration does not clear visible narration text.
- Replay repeats the current narration text when one exists.
- Duplicate same events must not stack overlapping audio.
- `departed` remains conservative: store the event and stop or clear speech according to existing departed behavior. It should not introduce a departed narration UI in Epic 17 unless separately approved.

## 9. Playback state model

Epic 17 should use the existing `ActiveTourPlaybackStatus` values:

- `idle`: no active speech is selected or playback has completed.
- `loading`: TTS engine or utterance target is initializing.
- `speaking`: foreground TTS is speaking.
- `stopped`: user action, route progression, tour end, app pause, or controller disposal stopped speech.
- `error`: TTS failed but the active tour remains usable.
- `paused`: remains unused in v1 unless implementation proves trivial and safe.

Expected transitions:

- Narration selected: `loading` then `speaking`.
- TTS start callback: `speaking`.
- TTS completion callback: `idle` or `stopped`, depending on whether the utterance completed naturally or was stopped.
- TTS stop: `stopped`.
- TTS error: `error`.
- App pause or background: `stopped`.

If plugin callbacks are unreliable on emulator, tests should assert controller intent through fake engines and QA should document runtime observations instead of overclaiming callback precision.

## 10. Error/unavailable behavior

- TTS initialization failure must not crash.
- TTS speak failure must not crash.
- Missing language or unavailable engine must not crash.
- Active tour keeps the current narration text visible.
- Active tour controls remain usable.
- Use sanitized user-readable error labels.
- Do not show raw platform exception text in the active-tour UI.
- Do not show modal blocking dialogs during an active tour.
- TTS errors should not move the active tour to `ActiveTourStatus.error` unless the tour itself cannot continue.
- TTS errors may set playback status to `error` and show a small recoverable audio message.

## 11. Foreground lifecycle

- Epic 17 is foreground-only.
- App pause, background, or route disposal should stop speech.
- No background resume.
- No foreground service.
- No notification.
- No guarantee of audio after screen lock or app switch.
- Physical-device QA must explicitly confirm that stopping on background behaves safely.

## 12. UI behavior

- Existing `ActiveTourScreen` remains the main surface.
- Add only minimal audio controls:
  - Stop narration.
  - Replay narration, if current narration text exists.
  - Speaking/error indicator.
- Keep simulation controls available.
- Keep narration text visible.
- No broad redesign.
- Controls must be large enough for the driving context.
- No map UI.
- No navigation UI.
- No route polyline UI.

## 13. Test strategy

- Unit tests use `FakeTtsEngine` for controller call sequences.
- Unit tests should cover:
  - approaching event speaks once.
  - arrived event speaks once.
  - new narration stops previous speech.
  - duplicate same event does not overlap speech.
  - `advance()`, `previous()`, `end()`, `reset()`, and `dispose()` stop speech.
  - TTS speak failure sets playback error without clearing visible narration.
  - TTS unavailable stays recoverable.
- Widget tests should cover:
  - Stop narration control calls controller behavior.
  - Replay control appears only when current narration text exists.
  - Playback error indicator is visible and non-blocking.
- No real TTS in unit or widget tests.
- Android emulator QA proves wiring, state, and UI behavior.
- Physical Android QA is required to claim real audible playback.

## 14. Validation matrix

Mobile implementation validation:

```bash
cd apps/mobile
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
```

Android emulator runtime validation:

```bash
cd apps/mobile
flutter run -d emulator-5554 \
  --dart-define=API_BASE_URL="$API_BASE_URL" \
  --dart-define=SUPABASE_URL="$SUPABASE_URL" \
  --dart-define=SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  --dart-define=TENANT_ID="$TENANT_ID"
```

Physical Android QA:

- Confirm audible playback on active-tour approaching narration.
- Confirm audible playback on arrived narration.
- Confirm Stop narration stops speech.
- Confirm Replay repeats current narration.
- Confirm app background stops speech.
- Confirm no fatal Flutter red screen.

If dependency or lockfile changes occur:

- Review `apps/mobile/pubspec.lock`.
- Confirm no unrelated dependency drift.
- No API or web validation is required unless API or web files are touched.

Do not print secret Dart define values in logs or QA reports.

## 15. PR slicing plan

Adjust PR numbers if the repository already has newer PRs.

### PR #67 — `chore(mobile): add TTS engine provider plumbing`

- Branch: `chore/mobile-tts-engine-provider-plumbing`
- Goal: Add provider and injection plumbing without real TTS.
- Likely files:
  - `apps/mobile/lib/services/narration_service.dart`
  - `apps/mobile/lib/features/tour/application/active_tour_controller.dart`
  - `apps/mobile/test/features/tour/active_tour_controller_test.dart`
- Acceptance criteria:
  - Add `ttsEngineProvider` defaulting to `NoOpTtsEngine`.
  - Inject `TtsEngine` into `ActiveTourController`.
  - Existing behavior remains unchanged.
  - Tests use fake or no-op TTS without real audio.
- Validation:
  - `cd apps/mobile && flutter analyze`
  - `flutter test`
  - `flutter build apk --debug`
- Out of scope:
  - `flutter_tts`
  - `pubspec.yaml`
  - `pubspec.lock`
  - AndroidManifest
  - UI changes

### PR #68 — `feat(mobile): add Flutter TTS engine behind TtsEngine`

- Branch: `feat/mobile-flutter-tts-engine`
- Goal: Add the real foreground TTS engine behind the existing app boundary.
- Likely files:
  - `apps/mobile/pubspec.yaml`
  - `apps/mobile/pubspec.lock`
  - `apps/mobile/lib/services/narration_service.dart`
  - `apps/mobile/android/app/src/main/AndroidManifest.xml`, only if `TTS_SERVICE` query is confirmed necessary
- Acceptance criteria:
  - Add `flutter_tts` after verifying current latest compatible version.
  - Add `FlutterTtsEngine`.
  - Add Android TTS service package visibility query only if confirmed necessary.
  - Provider may still default to `NoOpTtsEngine` if safer.
  - No controller behavior flip unless explicitly included.
- Validation:
  - `cd apps/mobile && flutter pub get`
  - `flutter analyze`
  - `flutter test`
  - `flutter build apk --debug`
- Stop conditions:
  - Plugin requires native Android source changes.
  - Plugin requires permissions beyond package visibility query.
  - Plugin requires unrelated Android build changes.

### PR #69 — `feat(mobile): speak active-tour narration in foreground`

- Branch: `feat/mobile-active-tour-foreground-tts-playback`
- Goal: Wire selected narration to foreground TTS.
- Likely files:
  - `apps/mobile/lib/features/tour/application/active_tour_controller.dart`
  - `apps/mobile/lib/features/tour/application/active_tour_state.dart`, only if error text/state needs a small addition
  - `apps/mobile/test/features/tour/active_tour_controller_test.dart`
- Acceptance criteria:
  - Simulated approaching speaks current narration.
  - Simulated arrived speaks current narration.
  - Fallback narration text can be spoken.
  - New narration interrupts old narration.
  - Stop/advance/previous/end/reset/dispose stop speech.
  - Fake engine tests prove call order.
- Validation:
  - `cd apps/mobile && flutter analyze`
  - `flutter test`
  - `flutter build apk --debug`
- Out of scope:
  - UI redesign
  - background playback
  - maps/navigation
  - GPS/geofencing

### PR #70 — `feat(mobile): add active-tour audio controls`

- Branch: `feat/mobile-active-tour-audio-controls`
- Goal: Add minimal foreground audio controls.
- Likely files:
  - `apps/mobile/lib/features/tour/presentation/screens/active_tour_screen.dart`
  - `apps/mobile/test/features/tour/active_tour_screen_test.dart`
- Acceptance criteria:
  - Stop narration control is visible when speech/narration is active.
  - Replay narration control is visible when current narration text exists.
  - Playback status or error indicator is visible and non-blocking.
  - Foreground lifecycle stop is covered if implemented at screen lifecycle.
- Validation:
  - `cd apps/mobile && flutter analyze`
  - `flutter test`
  - `flutter build apk --debug`
- Out of scope:
  - Broad UI redesign
  - Android Auto
  - maps/navigation

### PR #71 — `qa(mobile): validate foreground TTS narration on Android`

- Branch: `qa/mobile-active-tour-foreground-tts-smoke`
- Goal: Document Android foreground TTS QA.
- Likely files:
  - `docs/qa/MOBILE_ACTIVE_TOUR_FOREGROUND_TTS_SMOKE_2026-05-03.md`, or current-date equivalent
- Acceptance criteria:
  - Emulator QA documents runtime state and UI behavior.
  - Physical Android QA documents audible playback before production-ready claim.
  - Report confirms no GPS, geofencing, Android Auto, maps, or background playback.
- Validation:
  - Docs-only diff.

## 16. Risks and stop conditions

Risks:

- Emulator audio can be unreliable.
- Physical Android device is needed for production-ready audible playback confidence.
- Plugin Android build or Kotlin requirements may conflict with current generated Android project settings.
- Android package visibility may require `TTS_SERVICE` query.
- Device may not have a TTS engine installed or enabled.
- Long narration may exceed engine input limits or create poor driving UX.
- Overlapping speech can occur if duplicate events are not guarded.
- Stop can fail or lag depending on engine behavior.
- App backgrounding can leave speech running if lifecycle stop is missed.
- Audio focus can conflict with music or navigation apps.
- Driving context increases safety requirements for button size, distraction, and failure modes.

Stop and re-plan if:

- Plugin requires native Android source changes.
- Plugin requires runtime permissions beyond package visibility query.
- Implementation needs a foreground service.
- Implementation needs Android Auto.
- Implementation needs maps, navigation, or route polylines.
- Implementation needs real GPS, geofencing, or location permissions.
- Physical Android QA reveals a crash.
- Tests require real platform TTS.
- The Add-to-Tour snackbar context assertion blocks reliable TTS QA setup.

## 17. Decision log

Frozen defaults:

- Plugin recommendation: `flutter_tts`.
- Autoplay on simulated proximity: yes, while foregrounded.
- Stop button: required.
- Replay: should-have if low risk.
- Pause/resume: deferred.
- Background playback: deferred.
- Audio focus ducking: deferred.
- `audio_session`: deferred from the first TTS slice.
- Android Auto: deferred.
- Geolocation/geofencing: deferred.
- Maps/navigation/route polylines: deferred.
- Physical Android QA: required before production-ready audible playback claim.
- iOS implementation/QA: deferred.
