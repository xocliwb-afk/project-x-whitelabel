# Android Auto Integration Architecture

## Overview

Android Auto requires a **native Kotlin CarAppService** — it cannot be built purely in Flutter.
Flutter manages all business logic (tour state, narration, geofencing) and communicates with the
native Auto surface via **platform channels**.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Flutter Layer                      │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ TourStore     │  │ Narration    │  │ Proximity │ │
│  │ (Riverpod)   │  │ Service      │  │ Service   │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         │                 │                │        │
│         └────────┬────────┘                │        │
│                  │                         │        │
│         ┌────────▼────────┐                │        │
│         │ AndroidAutoSvc  │◄───────────────┘        │
│         └────────┬────────┘                         │
│                  │ MethodChannel                    │
├──────────────────┼──────────────────────────────────┤
│                  │ Platform Channel Bridge           │
├──────────────────┼──────────────────────────────────┤
│                  │                                   │
│         ┌────────▼────────┐                         │
│         │ CarAppService   │ (native Kotlin)         │
│         │                 │                         │
│         │ ┌─────────────┐ │                         │
│         │ │ Navigation  │ │                         │
│         │ │ Template    │ │ ── Shows tour progress  │
│         │ └─────────────┘ │                         │
│         │ ┌─────────────┐ │                         │
│         │ │ Message     │ │                         │
│         │ │ Template    │ │ ── Shows narration text │
│         │ └─────────────┘ │                         │
│         └─────────────────┘                         │
│                   Native Android Layer               │
└─────────────────────────────────────────────────────┘
```

## Data Flows

### Flutter → Android Auto (via MethodChannel)

| Data | When | Purpose |
|------|------|---------|
| TourDriveState | On each stop change | Update Auto UI with current/next stop |
| Narration text | On proximity event | Display narration on Auto screen |
| Navigation URI | On user "Navigate" tap | Launch Maps/Waze with destination |
| Tour progress | Continuously | Show stop N of M |

### Android Auto → Flutter (via MethodChannel)

| Event | When | Purpose |
|-------|------|---------|
| nextStop | User taps "Next" | Advance to next tour stop |
| previousStop | User taps "Previous" | Go back to previous stop |
| pauseNarration | User taps "Pause" | Stop TTS playback |
| resumeNarration | User taps "Resume" | Resume TTS playback |
| navigateToCurrent | User taps "Navigate" | Launch navigation to current stop |
| audioFocusLost | Another app takes audio | Pause narration gracefully |

## Native Implementation Requirements

### AndroidManifest.xml
- Register CarAppService with `androidx.car.app.CarAppService` intent filter
- Declare `minCarApiLevel` in metadata
- Add `com.google.android.gms.car.application` metadata

### Kotlin Classes Needed
1. **ProjectXCarAppService** — extends `CarAppService`, returns `Session`
2. **TourSession** — extends `Session`, manages screen lifecycle
3. **TourNavigationScreen** — `NavigationTemplate` showing current stop + map
4. **TourNarrationScreen** — `MessageTemplate` showing narration text
5. **FlutterBridge** — receives data from Flutter `MethodChannel`

### Dependencies (native, not Flutter)
- `androidx.car.app:app:1.4.0` (Car App Library)
- `androidx.car.app:app-projected:1.4.0` (for phone projection)

## Current Status

- **Flutter side**: `AndroidAutoService` stub with interface defined
- **Native side**: Not yet implemented
- **Platform channel**: Not yet registered
- **Timeline**: Deferred to a later epic after core mobile screens are built

## Testing Strategy

1. Use `simulateConnect()` / `simulateDisconnect()` to test Flutter logic
2. Use Desktop Head Unit (DHU) from Android Auto SDK for native testing
3. Test on physical Android Auto head unit for final validation
