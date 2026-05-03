# Mobile Android Runtime Smoke Rerun — 2026-05-02

## 1. Header

- Branch: `qa/mobile-android-runtime-rerun`
- Commit tested: `2efc32d qa(mobile): add Android runtime smoke report (#48)`
- Date: 2026-05-02 local
- QA/tooling mode: Android runtime smoke after SDK + scaffold
- Epic status: Epic 15 complete; Epic 16 not started

## 2. Toolchain status

- `ANDROID_HOME=/home/bwilcox/Android/Sdk`
- `ANDROID_SDK_ROOT=/home/bwilcox/Android/Sdk`
- `JAVA_HOME=/usr/lib/jvm/java-21-openjdk`
- Bare `java -version`: OpenJDK `25.0.2`
- `JAVA_HOME` JDK: OpenJDK `21.0.10`

`flutter --version`:

```text
Flutter 3.41.9 • channel stable • https://github.com/flutter/flutter.git
Framework • revision 00b0c91f06 (3 days ago) • 2026-04-29 10:03:19 -0700
Engine • hash 9161402dc0e134b3fb5adee5046b6e84b1a5e1c1
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

`flutter devices` after AVD launch:

```text
Found 3 connected devices:
  sdk gphone64 x86 64 (mobile) • emulator-5554 • android-x64 • Android 16 (API 36) (emulator)
  Linux (desktop)              • linux         • linux-x64   • Fedora Linux 43
  Chrome (web)                 • chrome        • web         • Google Chrome 146.0.7680.177
```

`flutter emulators`:

```text
Pixel_6_API_36 • Pixel 6 API 36 • Google • android
```

`adb devices` after AVD launch:

```text
List of devices attached
emulator-5554	device
```

## 3. Android scaffold status

- `apps/mobile/android` exists.
- Namespace: `com.projectx.project_x_mobile`
- Application ID: `com.projectx.project_x_mobile`
- App label: `project_x_mobile`
- MainActivity path: `apps/mobile/android/app/src/main/kotlin/com/projectx/project_x_mobile/MainActivity.kt`
- No forbidden platform folders found under `apps/mobile`: no `ios`, `web`, `linux`, `macos`, or `windows`.
- No `com.example` package/namespace references found.
- No signing secrets, `key.properties`, keystore, or `.jks` files found in the repo diff.

## 4. Build validation

`cd apps/mobile && flutter pub get`:

```text
Got dependencies!
57 packages have newer versions incompatible with dependency constraints.
```

Note: pub reported advisory decode warnings from `https://pub.dev` for a few packages, but dependency resolution completed successfully.

`flutter analyze`:

```text
No issues found! (ran in 1.1s)
```

`flutter test`:

```text
All tests passed!
```

`flutter build apk --debug`:

```text
✓ Built build/app/outputs/flutter-apk/app-debug.apk
```

## 5. Runtime configuration

Required runtime Dart defines were not present in the local shell:

```text
API_BASE_URL=<missing>
SUPABASE_URL=<missing>
SUPABASE_ANON_KEY=<missing>
TENANT_ID=<missing>
```

`SUPABASE_ANON_KEY` was not printed because it was not set. Future reruns must redact it as `***` in logs and reports.

## 6. Android runtime launch

- Android device/emulator ID: `emulator-5554`
- `flutter run` attempted: no
- Launch result: skipped
- First visible app state: not observed
- Fatal errors: none observed because the app was not launched
- API/brand/auth errors: not observed because the app was not launched

Runtime launch was skipped because all four required runtime Dart defines were missing. No app run was attempted without explicit runtime configuration.

## 7. Findings table

| ID | Severity | Area | Summary | Evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| QA-ANDROID-RERUN-001 | ENV/setup | Runtime config | Android SDK, emulator visibility, automated Flutter validation, and debug APK build now pass, but runtime launch could not run because required Dart defines were missing. | `flutter devices` saw `emulator-5554`; `flutter build apk --debug` passed; `API_BASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `TENANT_ID` were missing. | Provide safe runtime values and rerun Android runtime smoke with secrets redacted. |

No P0/P1 Android build or emulator blockers were found in this smoke scope. Product runtime behavior remains unverified until runtime configuration is provided.

## 8. Recommended next action

Provide runtime config and rerun this smoke:

- `API_BASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `TENANT_ID`

Do not start Epic 16 until Android runtime smoke is proven or the remaining runtime-config blocker is explicitly accepted.

## 9. Scope confirmation

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
