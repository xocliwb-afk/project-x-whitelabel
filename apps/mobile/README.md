# Project X Mobile

This Flutter app lives under `apps/mobile` and currently contains the Dart source,
tests, and generated local Flutter tool artifacts only. The Android platform
folder is not committed in this repo.

This document covers local Android SDK and emulator setup needed before full
mobile device/emulator QA. It does not implement Android Auto, geofencing, TTS
playback, native Android services, platform channels, embedded maps, route
polylines, or navigation handoff.

## Current Repo Reality

- Flutter app source is under `apps/mobile/lib`.
- Flutter tests are under `apps/mobile/test`.
- `apps/mobile/android` is not currently committed.
- Do not run `flutter create --platforms=android .` in this repo unless a
  separate PR explicitly approves generated platform files.
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

6. Validate the mobile project without generating platform folders:

   ```bash
   cd apps/mobile
   flutter pub get
   flutter analyze
   flutter test
   ```

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
- [ ] No generated platform folders, such as `apps/mobile/android`, are committed.

## Out Of Scope

- Android Auto production implementation
- Geofencing
- TTS playback
- Native Android services
- Platform channels
- Embedded maps
- Route polylines
- Navigation handoff
- Generated Android platform folder
- APK/AAB builds
- CI emulator setup
