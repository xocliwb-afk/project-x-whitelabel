# Epic 16 — Mobile Active Tour Runtime Contract

## 1. Status

- This is the planning contract for Epic 16 mobile active-tour runtime work.
- Epic 15 is complete.
- Pre-Epic-16 hardening is complete.
- Android runtime launch is proven on `Pixel_6_API_36 / emulator-5554`.
- Signed-out Search access was fixed and verified after PR #54 and PR #55.
- This document freezes behavior before code implementation begins.

## 2. Current repo truth

- Mobile has a real Tour draft/current-tour UI in `apps/mobile/lib/features/tour`.
- `TourDraftState` stores local draft stops, persisted tour list, `currentTour`, schedule fields, save/delete loading state, and errors.
- Persisted tour actions are auth-gated. Signed-out users can build a local draft but cannot save persisted tours.
- `NarrationService` exists and can fetch `GET /api/tours/:id/narrations` through `ApiClient`.
- `TtsEngine` and `NoOpTtsEngine` exist as interfaces/placeholders only.
- `ProximityService` exists with `registerGeofences`, `unregisterAll`, `simulateArrival`, and `simulateApproaching`; despite the method names, it is a simulation stub and does not register native geofences.
- `AndroidAutoService` and `TourDriveState` exist as stubs only. They do not register a platform channel and do not talk to native Android Auto.
- The API has authenticated persisted tour routes and `GET /api/tours/:id/narrations`.
- The shared narration contract includes `NarrationPayload`, `NarrationTrigger`, `ProximityEvent`, and `ProximityEventType`.
- API narration generation currently produces `approaching` narration payloads for tour stops and falls back to address-only narration when listing enrichment is unavailable.
- There is no mobile active-tour runtime controller yet.
- There is no current stop index, playback state, or active-drive state machine yet.
- Mobile does not currently consume narration payloads in runtime UI.
- `apps/mobile/pubspec.yaml` does not include `flutter_tts`, `geolocator`, `permission_handler`, or an audio focus dependency.
- The main Android manifest does not declare location, background location, foreground service, notification, wake lock, Android Auto, or TTS permissions/services.

## 3. Epic 16 MVP scope

In scope for the Epic 16 MVP:

- Mobile active-tour runtime state.
- Selected/current stop model.
- Current, next, and previous stop controls.
- Narration payload loading and selection.
- Simulated proximity events first.
- Logging/display narration engine before real TTS.
- Active-tour simulation UI after the state machine is proven.
- Android emulator QA report after the runtime path is implemented.

## 4. Explicit non-scope

Out of scope for the Epic 16 MVP unless separately approved:

- Android Auto production implementation.
- Native Android `CarAppService`.
- Platform channels.
- Native geofencing.
- Background location.
- Foreground services.
- `ACCESS_BACKGROUND_LOCATION`.
- Embedded maps.
- Route polylines.
- Navigation handoff.
- Play Store release or signing.
- Broad UI redesign.
- API or schema migrations unless separately approved.
- `flutter_tts` until the simulated/logging path is proven.
- `geolocator` until the simulation path is proven.

## 5. Active tour state model

The active-tour runtime should use explicit states:

- `idle`: no active tour is loaded.
- `loading`: a persisted tour and/or narration payloads are loading.
- `ready`: a tour is loaded and ordered, but drive mode has not started.
- `driving`: drive mode is active and no narration is currently running.
- `narrating`: a narration payload is being displayed/logged/spoken.
- `paused`: narration or drive progression is paused by the user.
- `finished`: the final stop has been completed or the user ended the tour.
- `error`: a recoverable runtime error is present.

The runtime state should include:

- `tourId`.
- `tour`.
- Ordered stops.
- `currentStopIndex`.
- `currentStop`.
- `nextStop`.
- Narration payload map by `tourStopId` and trigger.
- Last proximity event.
- Current narration text.
- Playback state.
- Error message.

The initial implementation should keep this state in memory. Persistence of active-drive state is future scope.

## 6. Active tour behavior

The active-tour runtime should expose these operations:

- `load(tourId)`: load a persisted tour and narration data. Enter `ready` if the tour has at least one stop.
- `start()`: enter `driving` at the current stop, defaulting to the first ordered stop.
- `advance()`: move to the next stop. If already at the final stop, enter `finished`.
- `previous()`: move to the previous stop. If already at the first stop, remain at the first stop.
- `end()`: stop narration and enter `finished`.
- `reset()`: clear active runtime state and return to `idle`.

Stop ordering rules:

- Order stops by `TourStop.order` ascending.
- If duplicate order values appear, preserve API order within the duplicate group.
- If no valid stops exist, keep the runtime in `error` with a user-readable message.

Bounds behavior:

- `currentStopIndex` must never become negative.
- `currentStopIndex` must never exceed the last stop index.
- `nextStop` is `null` at the final stop.
- `previous()` at index `0` is a no-op.
- `advance()` at the final stop ends the active tour.

## 7. Narration behavior

Narration data selection:

- Prefer `Tour.narrationPayloads` when present and valid.
- Otherwise fetch `GET /api/tours/:id/narrations`.
- If API auth or network failure occurs, continue the tour without crashing.
- If no matching payload exists, generate fallback address-only display text from the current stop.

Trigger rules:

- `approaching` selects an `approaching` payload for the event stop.
- `arrived` selects an `arrived` payload when available; otherwise it falls back to address-only text.
- `manual` replay is allowed for the current stop and should reuse the current stop's best available payload.
- `departed` is part of the shared model but does not require initial UI support.

Duplicate and missing payload rules:

- A repeated same trigger for the same stop should not replay automatically unless the user manually requests replay.
- A new trigger for a new stop interrupts the previous narration.
- Invalid payloads should be ignored, and the runtime should continue with fallback narration.
- Missing payloads are not fatal.

## 8. Proximity behavior

The first implementation slice is simulation-first.

- No real GPS is used in the first implementation slice.
- No location permission is requested in the first implementation slice.
- No native geofence is registered in the first implementation slice.
- No coordinates are posted back to the API.

Supported simulated proximity events:

- `approaching`.
- `arrived`.
- `departed` may remain model-only initially and does not require user-facing controls.

Event handling:

- Ignore unknown `tourStopId` values.
- Ignore events for a non-active `tourId`.
- Out-of-order events should move to the referenced stop only when that stop exists in the active tour.
- If an event references a later stop, set that stop as current and log/display the event-derived narration.
- If an event references an earlier stop, allow it only when the user is using simulation controls; do not infer route backtracking automatically.

## 9. TTS/playback behavior

The first implementation uses a logging/display narration engine.

- No real audio initially.
- No `flutter_tts` dependency initially.
- No audio focus behavior initially.

Playback states:

- `idle`: no narration selected.
- `loading`: narration data or playback target is being resolved.
- `speaking/logging`: narration text is being displayed/logged by the first implementation.
- `paused`: playback is paused.
- `stopped`: playback was stopped by user action or tour end.
- `error`: playback failed but the active tour remains usable.

Playback rules:

- New narration interrupts previous narration.
- Stop/end clears current playback.
- Playback failures never crash the tour runtime.
- Real `flutter_tts` must be a later isolated PR after the logging/display path is proven.

## 10. Permission/privacy boundary

- No location permission in core state-machine PRs.
- No background location.
- No foreground service.
- No persistent GPS storage.
- No coordinates sent back to the API.
- Future real location work requires explicit user consent and a separate implementation plan.
- Any future permission prompt must explain why location is needed, when it is used, and how to stop it.

## 11. Guest/auth behavior

- Signed-out/local tours may not be able to fetch auth-gated persisted narrations.
- Signed-out active-tour simulation must not crash.
- Guest fallback is address-only narration or visual-only runtime.
- Persisted/saved tour narration remains auth-dependent unless a later API decision changes it.
- If a signed-out user attempts an auth-required narration fetch, show a recoverable state and continue with fallback text.

## 12. Error/offline behavior

The runtime must handle these cases without fatal app crashes:

- API unavailable: keep tour state usable when possible and show recoverable error text.
- Narration fetch `401` or `403`: continue with address-only/visual-only runtime.
- Narration fetch `404`: keep the active tour loaded if the tour is otherwise available; show fallback text.
- Invalid payload: ignore invalid payload and use fallback text.
- Missing stop: enter `error` if no valid stop exists; ignore event if only the event stop is unknown.
- TTS/logging failure: set playback error and keep active tour controls usable.
- App backgrounded: first implementation makes no background guarantees.
- Emulator versus physical device: emulator simulation validates state machine only; real GPS/audio behavior requires later physical-device QA.

## 13. PR slicing plan

### PR 57 — `feat/mobile-active-tour-runtime`

- Goal: Add pure Dart active-tour state machine.
- Files likely to change: mobile runtime/controller files and focused tests.
- Acceptance: load/start/advance/previous/end/reset behavior is tested.
- Validation: `cd apps/mobile && flutter analyze && flutter test`.
- Out of scope: UI, dependencies, AndroidManifest, TTS, proximity subscription, platform channels.

### PR 58 — `feat/mobile-active-tour-narration`

- Goal: Load and select narration payloads for active tour stops.
- Files likely to change: mobile narration/runtime services and tests.
- Acceptance: attached payloads are preferred, endpoint fetch is used when needed, fallback text works.
- Validation: mobile analyze/test plus API tests if any contract assumptions are touched.
- Out of scope: real audio, location permissions, native code, UI.

### PR 59 — `feat/mobile-proximity-simulation-source`

- Goal: Add a simulation event source abstraction.
- Files likely to change: mobile proximity/runtime files and tests.
- Acceptance: simulated `approaching` and `arrived` events drive current stop/narration state.
- Validation: mobile analyze/test.
- Out of scope: real GPS, geolocator, native geofencing, AndroidManifest.

### PR 60 — `feat/mobile-logging-narration-trigger`

- Goal: Simulated proximity triggers logging/display narration.
- Files likely to change: mobile runtime/narration files and tests.
- Acceptance: trigger-driven narration text is visible in runtime state and duplicates are handled.
- Validation: mobile analyze/test.
- Out of scope: `flutter_tts`, real audio, audio focus.

### PR 61 — `feat/mobile-active-tour-simulation-screen`

- Goal: Add a simulation UI route, likely `/tour/drive` or another agreed route.
- Files likely to change: mobile route/UI/runtime tests.
- Acceptance: emulator can start active tour simulation and use next/previous/simulated trigger controls.
- Validation: mobile analyze/test/build APK and Android emulator smoke.
- Out of scope: maps, navigation, platform channels, Android Auto.

### PR 62 — `qa/mobile-active-tour-simulation-smoke`

- Goal: Document Android emulator QA for active-tour simulation.
- Files likely to change: docs/qa only.
- Acceptance: report captures runtime config, emulator, active-tour simulation, errors, and remaining non-scope.
- Validation: docs-only diff.
- Out of scope: implementation changes.

Future isolated work:

- Isolated `flutter_tts` PR after logging/display narration is proven.
- Isolated `geolocator` PR after simulation is proven and consent model is approved.
- Android Auto implementation later, after phone runtime and TTS/location behavior are stable.

## 14. Validation matrix

Cross-surface validation for Epic 16 implementation PRs:

```bash
pnpm --filter @project-x/api typecheck
pnpm --filter @project-x/api build
pnpm --filter @project-x/api test
pnpm --filter web build
pnpm --filter web lint
cd apps/mobile && flutter pub get
flutter analyze
flutter test
flutter build apk --debug
```

Android emulator runtime smoke with Dart defines:

```bash
cd apps/mobile
flutter run -d emulator-5554 \
  --dart-define=API_BASE_URL="$API_BASE_URL" \
  --dart-define=SUPABASE_URL="$SUPABASE_URL" \
  --dart-define=SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  --dart-define=TENANT_ID="$TENANT_ID"
```

Do not print secret values in logs or QA reports.

## 15. Stop conditions

Stop and re-plan if any of these occur:

- A new dependency is needed before this contract says it is allowed.
- AndroidManifest permission changes are proposed before approval.
- Kotlin, Java, or native service code appears.
- Platform channels appear.
- Android Auto files are changed beyond docs.
- Maps, route polylines, or navigation handoff are added.
- API or schema contract drift is required.
- Validation fails and the fix would exceed the current PR scope.
- User privacy/location consent remains unresolved.

## 16. Decision log

Frozen decisions:

- Simulation-first before real geofencing.
- No Android Auto in Epic 16 core.
- No maps/navigation in Epic 16 core.
- No `flutter_tts` until logging/display narration is proven.
- No `geolocator` until simulation is proven.
- Active tour runtime is in-memory first.
- Signed-out fallback behavior is address-only/visual-only unless auth changes are approved.
- Native/platform work must be isolated after the phone runtime contract is implemented and QA-proven.
