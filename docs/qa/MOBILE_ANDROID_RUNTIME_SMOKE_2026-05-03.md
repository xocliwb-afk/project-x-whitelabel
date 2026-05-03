# Mobile Android Runtime Smoke Report — 2026-05-03

## 1. Header

- Branch: `qa/mobile-android-runtime-smoke`
- Commit tested: `9328c85 chore(mobile): add Android platform foundation (#47)`
- Date: 2026-05-03
- QA/tooling mode: observational report only
- Epic status: Epic 15 complete; Epic 16 not started

## 2. Android Scaffold Status

`apps/mobile/android` exists after PR #47.

Top-level mobile directories:

```text
apps/mobile
apps/mobile/.dart_tool
apps/mobile/android
apps/mobile/build
apps/mobile/lib
apps/mobile/test
```

No additional platform folders were present:

- `apps/mobile/ios`: absent
- `apps/mobile/web`: absent
- `apps/mobile/linux`: absent
- `apps/mobile/macos`: absent
- `apps/mobile/windows`: absent

Android identity/config:

- Package/namespace: `com.projectx.project_x_mobile`
- `applicationId`: `com.projectx.project_x_mobile`
- App label: `project_x_mobile`
- Gradle DSL style: Kotlin DSL (`*.gradle.kts`)
- MainActivity: `apps/mobile/android/app/src/main/kotlin/com/projectx/project_x_mobile/MainActivity.kt`
- `compileSdk`: `flutter.compileSdkVersion`
- `minSdk`: `flutter.minSdkVersion`
- `targetSdk`: `flutter.targetSdkVersion`

Safety checks:

- No `com.example` package/namespace found.
- No brand-specific package ID found.
- No signing secrets found by config search.
- No `key.properties`, `storePassword`, `keyPassword`, or `storeFile` found in Android config.

## 3. Toolchain Status

`flutter --version`:

```text
Flutter 3.41.9 • channel stable • https://github.com/flutter/flutter.git
Framework • revision 00b0c91f06 (3 days ago) • 2026-04-29 10:03:19 -0700
Engine • hash 9161402dc0e134b3fb5adee5046b6e84b1a5e1c1 (revision 42d3d75a56) (4 days ago) • 2026-04-28 17:31:55.000Z
Tools • Dart 3.11.5 • DevTools 2.54.2
```

`flutter doctor`:

```text
Doctor summary (to see all details, run flutter doctor -v):
[✓] Flutter (Channel stable, 3.41.9, on Fedora Linux 43 (KDE Plasma Desktop Edition) 6.19.10-200.fc43.x86_64, locale C.UTF-8)
[✗] Android toolchain - develop for Android devices
    ✗ Unable to locate Android SDK.
      Install Android Studio from: https://developer.android.com/studio/index.html
      On first launch it will assist you in installing the Android SDK components.
      (or visit https://flutter.dev/to/linux-android-setup for detailed instructions).
      If the Android SDK has been installed to a custom location, please use
      `flutter config --android-sdk` to update to that location.

[✓] Chrome - develop for the web
[✓] Linux toolchain - develop for Linux desktop
[✓] Connected device (2 available)
[✓] Network resources

! Doctor found issues in 1 category.
```

`flutter devices`:

```text
Found 2 connected devices:
  Linux (desktop) • linux  • linux-x64      • Fedora Linux 43 (KDE Plasma Desktop Edition) 6.19.10-200.fc43.x86_64
  Chrome (web)    • chrome • web-javascript • Google Chrome 146.0.7680.177

Run "flutter emulators" to list and start any available device emulators.
```

## 4. Flutter Validation

`cd apps/mobile && flutter pub get`:

```text
Resolving dependencies...
Downloading packages...
Failed to decode advisories for dio from https://pub.dev.
FormatException: advisoriesUpdated must be a String
Failed to decode advisories for http from https://pub.dev.
FormatException: advisoriesUpdated must be a String
Failed to decode advisories for shared_preferences_android from https://pub.dev.
FormatException: advisoriesUpdated must be a String
Got dependencies!
57 packages have newer versions incompatible with dependency constraints.
Try `flutter pub outdated` for more information.
```

Result: PASS with pub.dev advisory decode warnings.

`flutter analyze`:

```text
Analyzing mobile...
No issues found! (ran in 0.6s)
```

Result: PASS.

`flutter test`:

```text
00:01 +30: All tests passed!
```

Result: PASS.

## 5. Android Build/Runtime Status

Android SDK availability:

- Not available on this host.
- `flutter doctor` reports "Unable to locate Android SDK."

Android build:

- `flutter build apk --debug` was not run.
- Android SDK not installed on this host; `flutter build apk --debug` was skipped.

Android runtime launch:

- `flutter run` was not attempted.
- Reason: no Android emulator/device was listed in `flutter devices`, Android SDK is not installed, and required runtime Dart defines/test credentials were not supplied for app launch.

The Android scaffold is committed and inspectable, but Android build/runtime validation remains blocked by local toolchain setup.

## 6. Findings

| ID | Severity | Area | Summary | Evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| ENV-001 | ENV/setup | Android toolchain | Android SDK is not installed; Android build/runtime validation skipped. | `flutter doctor` reports "Unable to locate Android SDK"; `flutter devices` lists only Linux and Chrome. | Complete Android SDK setup from `apps/mobile/README.md`, then rerun this smoke report with `flutter build apk --debug`. |
| ENV-002 | ENV/setup | Runtime launch | Android runtime launch was not attempted. | No Android emulator/device listed; Android SDK missing; runtime Dart defines/test credentials were not supplied. | After Android SDK/emulator setup, provide safe QA runtime config and rerun Android emulator/device QA. |

## 7. Recommended Next Action

Complete local Android SDK setup from `apps/mobile/README.md`, then rerun this smoke report.

After Android SDK and an emulator/device are available:

1. Run `flutter doctor`.
2. Run `flutter devices`.
3. Run `cd apps/mobile && flutter build apk --debug`.
4. If the APK build passes, rerun mobile pre-demo QA against an Android emulator/device with safe runtime Dart defines.

Do not start Epic 16 until Android runtime QA is proven or the remaining Android toolchain blocker is explicitly accepted.

## 8. Scope Confirmation

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
