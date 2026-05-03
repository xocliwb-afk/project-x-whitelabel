# Mobile Pre-Demo QA Report — 2026-05-03

## 1. Header

- Branch: `qa/mobile-device-emulator-qa`
- Commit tested: `4280bf7 docs(mobile): document Android SDK and emulator setup (#45)`
- Date: 2026-05-03
- QA mode: docs-only observational QA; no code changes
- Epic status: Epic 15 complete; Epic 16 not started

## 2. Environment

Host:

```text
Linux debian.attlocal.net 6.19.10-200.fc43.x86_64 #1 SMP PREEMPT_DYNAMIC Wed Mar 25 16:09:19 UTC 2026 x86_64 GNU/Linux
```

Flutter:

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

API target assumptions:

- `API_BASE_URL` defaults to `http://10.0.2.2:3002`, which is appropriate for Android emulator access to a host API.
- Chrome/Linux desktop runtime QA would likely need an explicit host-targeted override such as `API_BASE_URL=http://localhost:3002`.
- The API was not started during this docs-only QA pass.

Required Dart defines:

```text
API_BASE_URL=http://10.0.2.2:3002
SUPABASE_URL=<required>
SUPABASE_ANON_KEY=***
TENANT_ID=<required>
```

Notes:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `TENANT_ID` are required by `AppConfig`.
- Secrets were not collected or written into this report.

## 3. Current Mobile App Surfaces

Current routes/screens:

| Route | Access | Notes |
| --- | --- | --- |
| `/login` | Public | Authenticated users redirect to `/search`. |
| `/register` | Public | Authenticated users redirect to `/search`; pending verification can redirect from `/` or `/login` to `/register`. |
| `/search` | Public | List-first mobile search surface. |
| `/listing/:id` | Public | Listing detail surface; accepts optional `Listing` preview through `GoRouter.extra`. |
| `/tour` | Public local draft | Signed-out local draft behavior is allowed; persisted tour actions remain auth-dependent. |

Router behavior observed from `apps/mobile/lib/core/routing/app_router.dart`:

- Signed-in users redirect from `/`, `/login`, and `/register` to `/search`.
- Signed-out users reaching `/` redirect to `/login` after auth initialization.
- Routes outside the public contract redirect signed-out users to `/login`.
- `/search`, `/listing/:id`, and `/tour` are public for browsing and local draft behavior.

## 4. Platform Folder Reality

`find apps/mobile -maxdepth 1 -type d | sort`:

```text
apps/mobile
apps/mobile/.dart_tool
apps/mobile/build
apps/mobile/lib
apps/mobile/test
```

Platform folder status:

- `apps/mobile/android`: absent
- `apps/mobile/web`: absent
- `apps/mobile/linux`: absent
- `apps/mobile/ios`: absent

Android emulator and physical Android runtime QA are blocked until a separate approved tooling/platform PR generates and reviews Android platform files.

Flutter Chrome/web runtime QA is blocked until a separate approved tooling/platform PR generates and reviews web platform files.

Linux desktop runtime QA is blocked until a separate approved tooling/platform PR generates and reviews Linux platform files.

The only platform-adjacent local folders present during this QA pass were ignored Flutter tool artifacts: `.dart_tool` and `build`.

## 5. Automated Validation

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

Result: PASS with pub.dev advisory decode warnings. No tracked or untracked file changes were left afterward.

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

Result: PASS, 30 tests.

## 6. Target Feasibility Matrix

| Target | Attempted | Result | Reason if skipped |
| --- | --- | --- | --- |
| Flutter unit/widget tests | yes | pass | `flutter test` passed 30 tests. |
| Flutter Chrome/web runtime | no | skipped | `apps/mobile/web` is absent; generating platform files is out of scope. |
| Android emulator | no | skipped | `apps/mobile/android` is absent and Android SDK is not installed. |
| Physical Android device | no | skipped | `apps/mobile/android` is absent and no Android device was detected. |
| Linux desktop | no | skipped | `apps/mobile/linux` is absent; generating platform files is out of scope. |
| iOS/macOS/Windows | no | skipped | Not configured and out of scope for this Linux-hosted QA pass. |
| Android Auto/DHU | no | skipped | Epic 16 / Android Auto production work is out of scope. |

Only automated Flutter package/analyze/test validation was executable in this pass without generating platform folders.

## 7. Manual QA Checklist

| Flow | Status | Evidence / reason |
| --- | --- | --- |
| Cold boot / brand bootstrap | SKIPPED | Runtime target blocked by missing platform folders; API/Supabase/tenant runtime env was not provided. |
| Brand loading error + retry | SKIPPED | Runtime target blocked; API was not started. |
| `/` redirect behavior | NOT RUN | Covered by route tests, but no runtime app target was launched. |
| `/login` signed-out behavior | NOT RUN | No runtime app target was launched. |
| `/register` behavior | NOT RUN | No runtime app target was launched. |
| signed-out `/search` | NOT RUN | Covered by tests; no runtime app target was launched. |
| search loading state | NOT RUN | Covered by widget tests; no runtime app target was launched. |
| search empty state | NOT RUN | Covered by widget tests; no runtime app target was launched. |
| search error/API unavailable state | NOT RUN | Covered by widget tests; API was not started for manual runtime QA. |
| search result rendering | NOT RUN | Covered by widget tests; no runtime app target was launched. |
| search filter behavior if present | NOT RUN | No runtime app target was launched. |
| search pagination/load more if present | NOT RUN | No runtime app target was launched. |
| Search → Listing Detail | NOT RUN | Covered by tests; no runtime app target was launched. |
| direct `/listing/:id` | NOT RUN | Covered by route/detail tests; no runtime app target was launched. |
| invalid listing ID | NOT RUN | No runtime app target/API session was launched. |
| Add to Tour from Search/Detail if available | NOT RUN | Covered by widget/controller tests for local behavior; no runtime app target was launched. |
| signed-out `/tour` | NOT RUN | Covered by route/tour tests; no runtime app target was launched. |
| local tour draft | NOT RUN | Covered by controller/screen tests; no runtime app target was launched. |
| current tour state | NOT RUN | Covered by tests; no runtime app target was launched. |
| signed-in tour save if Supabase/test account available | SKIPPED | Supabase config and a test account were not provided; runtime target was not launched. |
| logout/reset behavior if signed-in QA available | SKIPPED | Signed-in QA was not feasible without Supabase/test account/runtime target. |
| rate-limit interaction if feasible | SKIPPED | API was not started and no runtime app target was launched. |
| tenant misconfiguration behavior if safely testable | SKIPPED | No runtime app target was launched; report avoids intentionally breaking local config. |

## 8. Findings Table

| ID | Severity | Surface | Target | Summary | Evidence | Suggested follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| ENV-001 | ENV/setup | Mobile platform | Android emulator / physical Android | Runtime Android QA is blocked because `apps/mobile/android` is not committed. | `find apps/mobile -maxdepth 1 -type d` showed no `android` folder. | Create a separate explicit platform/tooling PR to generate and review Android platform files before emulator/device QA. |
| ENV-002 | ENV/setup | Mobile platform | Android emulator / physical Android | Android SDK is not installed on this host. | `flutter doctor` reported "Unable to locate Android SDK." | Complete Android Studio/SDK setup from `apps/mobile/README.md`, then rerun device QA after Android platform files exist. |
| ENV-003 | ENV/setup | Mobile platform | Chrome/web runtime | Flutter detects Chrome, but this repo has no `apps/mobile/web` platform folder. | `flutter devices` showed Chrome; platform folder inspection showed no `web` folder. | If browser runtime QA is required, use a separate platform/tooling PR to generate/review web platform files. |
| ENV-004 | ENV/setup | Mobile runtime | Signed-in flows | Signed-in manual QA needs Supabase config, tenant ID, API URL, and a test account. | `AppConfig` requires `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `TENANT_ID`; none were supplied for runtime QA. | Provide non-secret QA env values and a test user in a future runtime QA pass. |

No runtime product bugs were confirmed in this QA pass because runtime device/browser targets were blocked by missing platform folders and/or environment setup. Automated validation passed.

## 9. Skipped Items / Environment Limitations

- Android emulator QA skipped because `apps/mobile/android` is missing and Android SDK is not installed.
- Physical Android device QA skipped because `apps/mobile/android` is missing and no Android device was detected.
- Chrome/web runtime QA skipped because `apps/mobile/web` is missing.
- Linux desktop runtime QA skipped because `apps/mobile/linux` is missing.
- Signed-in flows skipped because Supabase config/test user values were not provided.
- API happy-path manual QA skipped because the API was not started.
- Runtime tenant/brand loading was not exercised because no runtime app target was launched.
- Android Auto/DHU was skipped as future Epic 16/out-of-scope work.

## 10. Pre-Existing Artifacts Noted

- `apps/mobile/lib/features/android_auto/` exists as a pre-existing architecture stub.
- The Android Auto code is not route-bound and was not exercised in this QA pass.
- This is not new Epic 16 work.
- Android Auto production implementation remains out of scope.

## 11. Follow-Up Recommendations

1. Create a separate explicit platform/tooling PR to generate and review `apps/mobile/android` before real Android emulator/device QA.
2. Complete Android Studio / Android SDK setup on the QA host, then verify `flutter doctor` reports the Android toolchain as available.
3. Rerun this QA report after Android platform files, SDK setup, API environment, tenant config, Supabase config, and a test account are ready.
4. If Chrome/web runtime QA is desired, create a separate platform/tooling PR to generate and review `apps/mobile/web`.
5. Track any future runtime bugs in separate PRs/issues. Do not fix bugs in this QA branch.

## 12. Scope Confirmation

- No Epic 16 work performed.
- No geofencing.
- No TTS playback.
- No Android Auto implementation.
- No maps.
- No route polylines.
- No navigation handoff.
- No mobile UI changes.
- No API changes.
- No web changes.
- No CI changes.
- No database schema changes.
- No dependency changes.
- No platform folders generated.
- No bug fixes committed.
