# Mobile Android Runtime Launch Smoke — 2026-05-02

## 1. Header

- Branch: `qa/mobile-android-runtime-launch`
- Commit tested: `8839045 qa(mobile): rerun Android runtime smoke (#49)`
- Date: 2026-05-02 local
- Mode: Android emulator runtime launch smoke
- Epic status: Epic 15 complete; Epic 16 not started

## 2. Toolchain/device

- `ANDROID_HOME=/home/bwilcox/Android/Sdk`
- `ANDROID_SDK_ROOT=/home/bwilcox/Android/Sdk`
- `JAVA_HOME=/usr/lib/jvm/java-21-openjdk`

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

## 4. Runtime config

Runtime Dart defines were not available in the local shell:

```text
API_BASE_URL=<missing>
SUPABASE_URL=<missing>
SUPABASE_ANON_KEY=<missing>
TENANT_ID=<missing>
```

No raw `SUPABASE_ANON_KEY` value was printed or written.

## 5. Runtime launch result

- Device ID: `emulator-5554`
- `flutter run` attempted: no
- Result: skipped
- First visible app state: not observed
- Brand/bootstrap state: not observed
- Initial route: not observed
- Fatal errors: none observed because the app was not launched
- API/auth/tenant errors: not observed because the app was not launched

Runtime launch was skipped because the required runtime Dart defines were missing. Running without those values would not be a valid product smoke test.

## 6. Findings

| ID | Severity | Area | Summary | Evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| QA-ANDROID-LAUNCH-001 | ENV/setup | Runtime config | Android emulator visibility, Flutter validation, and debug APK build passed, but app launch was skipped because runtime Dart defines were missing. | `flutter devices` listed `emulator-5554`; `flutter build apk --debug` passed; `API_BASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `TENANT_ID` were all missing. | Provide safe runtime values and rerun Android emulator launch smoke with secrets redacted. |

No app runtime blockers were confirmed in this pass because the app was not launched.

## 7. Recommendation

Fix/provide runtime config and rerun this smoke. Do not start Epic 16 until Android runtime smoke is proven or the remaining runtime-config risk is explicitly accepted.

## 8. Scope confirmation

- No Epic 16 work.
- No Android Auto, geofencing, TTS, platform channels, maps, or navigation work.
- No app/API/web/CI changes.
- No package/lockfile/schema changes.
- No bug fixes.
- No secrets committed.
