# Mobile Android Runtime Launch With Config — 2026-05-02

## 1. Header

- Branch: `qa/mobile-android-runtime-launch-with-config`
- Commit tested: `18be3a4 qa(mobile): add Android emulator launch smoke report (#50)`
- Date: 2026-05-02 local
- Mode: Android emulator runtime launch smoke with runtime config
- Epic status: Epic 15 complete; Epic 16 not started

## 2. Toolchain/device

- `ANDROID_HOME=/home/bwilcox/Android/Sdk`
- `ANDROID_SDK_ROOT=/home/bwilcox/Android/Sdk`
- `JAVA_HOME=/usr/lib/jvm/java-21-openjdk`
- Bare `java -version`: OpenJDK `25.0.2`

`flutter --version`:

```text
Flutter 3.41.9 • channel stable • https://github.com/flutter/flutter.git
Framework • revision 00b0c91f06 • 2026-04-29 10:03:19 -0700
Tools • Dart 3.11.5 • DevTools 2.54.2
```

`flutter doctor`:

```text
[✓] Flutter (Channel stable, 3.41.9, on Fedora Linux 43, locale C.UTF-8)
[✓] Android toolchain - develop for Android devices (Android SDK version 36.0.0)
[✓] Chrome - develop for the web
[✓] Linux toolchain - develop for Linux desktop
[✓] Connected device
[✓] Network resources
• No issues found!
```

`flutter emulators`:

```text
Pixel_6_API_36 • Pixel 6 API 36 • Google • android
```

`flutter devices` after emulator launch:

```text
Found 3 connected devices:
  sdk gphone64 x86 64 (mobile) • emulator-5554 • android-x64 • Android 16 (API 36) (emulator)
  Linux (desktop)              • linux         • linux-x64   • Fedora Linux 43
  Chrome (web)                 • chrome        • web         • Google Chrome 146.0.7680.177
```

`adb devices` after emulator launch:

```text
List of devices attached
emulator-5554	device
```

## 3. Build validation

`cd apps/mobile && flutter pub get`:

```text
Got dependencies!
57 packages have newer versions incompatible with dependency constraints.
```

Note: pub reported non-fatal advisory decode warnings for a few hosted packages. Dependency resolution still completed successfully.

`flutter analyze`:

```text
No issues found! (ran in 1.2s)
```

`flutter test`:

```text
All tests passed!
```

`flutter build apk --debug`:

```text
✓ Built build/app/outputs/flutter-apk/app-debug.apk
```

## 4. Runtime config

Runtime Dart defines were not available in the local shell:

```text
API_BASE_URL=<missing>
SUPABASE_URL=<missing>
SUPABASE_ANON_KEY=<missing>
TENANT_ID=<missing>
```

No raw `SUPABASE_ANON_KEY`, JWT, session token, refresh token, or service-role key was printed or written.

## 5. Android runtime launch result

- Android device/emulator ID: `emulator-5554`
- `flutter run` attempted: no
- Result: skipped
- App installed: no
- App launched: no
- First visible app state: not observed
- Brand/bootstrap state: not observed
- Initial route: not observed
- Fatal errors: none observed because the app was not launched
- API/auth/tenant errors: not observed because the app was not launched
- Observed errors graceful or fatal: not applicable

Runtime launch was skipped because the required runtime Dart defines were missing. Running without those values would not validate the configured Android runtime path.

## 6. Findings table

| ID | Severity | Area | Summary | Evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| QA-ANDROID-CONFIG-001 | ENV/setup | Runtime config | Android SDK, emulator visibility, Flutter validation, and debug APK build passed, but runtime launch could not run because runtime Dart defines were missing. | `flutter devices` listed `emulator-5554`; `flutter build apk --debug` passed; `API_BASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `TENANT_ID` were all missing. | Provide safe runtime values and rerun Android emulator launch smoke with secrets redacted. |

No app runtime blockers were confirmed in this pass because the app was not launched.

## 7. Recommended next action

Provide runtime config and rerun this smoke. Do not start Epic 16 until Android runtime smoke is proven or the remaining runtime-config risk is explicitly accepted.

## 8. Scope confirmation

- No Epic 16 work performed.
- No Android Auto implementation.
- No geofencing.
- No TTS playback.
- No platform channels.
- No native services.
- No maps/navigation work.
- No Flutter app behavior changes.
- No API/web/CI changes.
- No package/lockfile/schema changes.
- No signing files.
- No bug fixes.
- No secrets committed.
