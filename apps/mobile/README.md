# Project X Mobile

This Flutter app lives under `apps/mobile` and contains the Dart source, tests,
and committed Android platform folder needed for local debug builds.

This document covers local Android SDK and emulator setup needed before full
mobile device/emulator QA. It does not implement Android Auto, geofencing, TTS
playback, native Android services, platform channels, route polylines,
navigation handoff, listing pins, map/list synchronization, filters, sort, or
favorites.

## Current Repo Reality

- Flutter app source is under `apps/mobile/lib`.
- Flutter tests are under `apps/mobile/test`.
- `apps/mobile/android` is committed.
- Do not run `flutter create --platforms=android .` in this repo unless a
  separate PR explicitly approves generated platform-file regeneration.
- CI intentionally runs Flutter analyze/test only. It does not run Android
  emulator checks, APK builds, or AAB builds.

## Prerequisites

- Flutter installed and available on `PATH`.
- Android Studio installed.
- Android SDK Command-line Tools installed.
- Android SDK Platform installed.
- Android Emulator installed.
- At least one Android Virtual Device (AVD) / emulator image installed.

## Setup Steps

1. Check the current Flutter toolchain:

   ```bash
   flutter doctor
   ```

2. Open Android Studio and install SDK components:

   - Open **Settings** / **Preferences**.
   - Open **Languages & Frameworks > Android SDK**.
   - Install an Android SDK Platform.
   - Install **Android SDK Command-line Tools**.
   - Install **Android Emulator**.

3. Accept Android SDK licenses:

   ```bash
   flutter doctor --android-licenses
   ```

4. Create an emulator / AVD:

   - Open Android Studio **Device Manager**.
   - Create a virtual device.
   - Install a matching system image if prompted.
   - Start the emulator.

5. Confirm Flutter can see the device:

   ```bash
   flutter devices
   ```

6. Validate the mobile project:

   ```bash
   cd apps/mobile
   flutter pub get
   flutter analyze
   flutter test
   ```

## Mapbox Access Token

The mobile map foundation reads a public Mapbox token from
`MAPBOX_ACCESS_TOKEN` through `--dart-define`. Do not commit the token or print
it in logs.

Example Android emulator run shape:

```bash
cd apps/mobile
flutter run -d emulator-5554 \
  --dart-define=API_BASE_URL="$API_BASE_URL" \
  --dart-define=SUPABASE_URL="$SUPABASE_URL" \
  --dart-define=SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  --dart-define=TENANT_ID="$TENANT_ID" \
  --dart-define=MAPBOX_ACCESS_TOKEN="$MAPBOX_ACCESS_TOKEN"
```

If `MAPBOX_ACCESS_TOKEN` is missing, the Search screen shows a non-secret map
placeholder instead of constructing the Mapbox map.

## Linux Host Notes

The current local workstation is Linux. On Linux, Android Studio and the Android
SDK are usually installed under the user home directory, such as
`~/Android/Sdk`. If `flutter doctor` cannot find the SDK, set `ANDROID_HOME` or
`ANDROID_SDK_ROOT` to the installed SDK path in your shell profile.

Emulator acceleration may require host virtualization support. If the emulator
does not boot, verify virtualization is enabled in BIOS/UEFI and that the Linux
user has access to the required virtualization device group for the host distro.

macOS and Windows setup is similar through Android Studio SDK Manager, but host
virtualization and shell environment setup differ by OS.

## Verification Checklist

- [ ] `flutter doctor` shows the Android toolchain as available.
- [ ] Android SDK licenses are accepted.
- [ ] An emulator appears in `flutter devices`.
- [ ] `cd apps/mobile && flutter pub get` succeeds.
- [ ] `flutter analyze` succeeds.
- [ ] `flutter test` succeeds.
- [ ] No unexpected generated platform drift appears in `git status`.
- [ ] `MAPBOX_ACCESS_TOKEN` is supplied when manually validating the map on an
   emulator or device.

## Out Of Scope

- Android Auto production implementation
- Geofencing
- TTS playback
- Native Android services
- Platform channels
- Route polylines
- Navigation handoff
- Listing pins, map/list synchronization, filters, sort, and favorites
- Unrelated generated platform churn
- APK/AAB builds
- CI emulator setup
