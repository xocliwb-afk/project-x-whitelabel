# Project X White Label — Android Auto & Narration Architecture

**Last Updated:** 2026-03-23

---

## 1. Current State

### API (built in Epics 7-8)
- **Narration service** (`apps/api/src/services/narration.service.ts`): generates rich narration text from listing data (price, beds, baths, sqft, property type, year built, DOM, highlights)
- **Narration endpoint** (`GET /api/tours/:id/narrations`): returns narration payloads enriched with listing data
- **Tour planning** generates narration payloads automatically during `planTour()`
- **Shared types** include `NarrationPayload`, `ProximityEvent`, `NarrationTrigger`, `ProximityEventType`

### Flutter (built in Epic 8 — stubs/interfaces)
- **NarrationService** (`apps/mobile/lib/services/narration_service.dart`): fetches narrations from API, `TtsEngine` abstract interface, `NoOpTtsEngine` for dev
- **ProximityService** (`apps/mobile/lib/services/proximity_service.dart`): `registerGeofences`, `unregisterAll`, `simulateArrival`, `simulateApproaching` — documents native requirements in comments
- **AndroidAutoService** (`apps/mobile/lib/features/android_auto/android_auto_service.dart`): `TourDriveState`, `AutoEvent` enum, `pushTourState`, `navigateToStop`, `simulateConnect/Disconnect`
- **Dart models**: `NarrationPayload`, `ProximityEvent`, `ProximityLocation` in `models/narration.dart`

### Not yet built
- Native Android geofence plugin (Kotlin)
- Native Android Auto CarAppService (Kotlin)
- Flutter TTS integration (flutter_tts)
- Real location tracking during tours
- Platform channel bridge (Dart ↔ Kotlin)

## 2. Concept Overview

When a user is on a property tour:
1. The mobile app tracks their location
2. As they approach a tour stop (geofence trigger), an arrival event fires
3. The system generates a narration payload for that listing
4. Text-to-speech reads the narration aloud
5. On Android Auto, a simplified UI shows the current/next listing info
6. Between stops, navigation guidance directs to the next stop

## 3. Arrival Detection

### Geofence Architecture

```
Location Service (Flutter/Native)
    │
    ├── Background location tracking
    │   └── Configurable update interval
    │
    ├── Geofence Registration
    │   ├── One geofence per TourStop (lat/lng + radius)
    │   ├── Default radius: 200m (configurable)
    │   └── Registered when tour is active
    │
    └── Geofence Transition Events
        ├── ENTER → ProximityEvent (type: "approaching")
        ├── DWELL → ProximityEvent (type: "arrived")
        └── EXIT → ProximityEvent (type: "departed")
```

### Platform Considerations

| Platform | Geofence API | Max Geofences | Notes |
|----------|-------------|---------------|-------|
| Android | GeofencingClient | 100 | Battery-efficient |
| iOS | CLLocationManager | 20 | More limited |

For a typical tour (5-15 stops), both platforms have sufficient capacity.

## 4. Proximity Events

### Proposed Type (for shared-types)

```typescript
interface ProximityEvent {
  id: string;
  tourId: string;
  tourStopId: string;
  listingId: string;
  type: "approaching" | "arrived" | "departed";
  timestamp: string; // ISO
  location: {
    lat: number;
    lng: number;
    accuracy: number; // meters
  };
  distanceToStop: number; // meters
}
```

## 5. Narration Payloads

### Proposed Type (for shared-types)

```typescript
interface NarrationPayload {
  tourStopId: string;
  listingId: string;
  trigger: "approaching" | "arrived";

  // Pre-composed narration text
  narrationText: string;

  // Structured data for custom TTS composition
  listing: {
    address: string;
    price: string; // formatted
    beds: number | null;
    baths: number | null;
    sqft: number | null;
    propertyType: string | null;
    description?: string;
    keyFeatures?: string[];
  };

  // Navigation context
  navigation?: {
    isLastStop: boolean;
    nextStopAddress?: string;
    nextStopDistanceMeters?: number;
  };
}
```

### Narration Text Generation

The narration text should be generated **server-side or at tour plan time**, not on-device:

1. **At tour planning** → API generates narration payloads for each stop using listing data
2. **Cached with tour** → Narration payloads stored with the planned tour
3. **Delivered to device** → Mobile app receives full narration data with the tour
4. **Triggered by proximity** → Geofence event triggers TTS playback of cached narration

This avoids network dependency during the tour and ensures consistent narration quality.

### Example Narration

> "Approaching your next stop: 1234 Oak Street. This 3-bedroom, 2-bathroom home is listed at $425,000. Built in 2018, it features 2,100 square feet of living space with an open floor plan and updated kitchen."

## 6. TTS Implications

| Aspect | Decision |
|--------|----------|
| Engine | Flutter TTS plugin (`flutter_tts`) for cross-platform |
| Voice | System default, configurable per brand |
| Language | English initially |
| Interruption | New narration interrupts previous |
| User control | Pause/resume, skip, volume via app or Android Auto |
| Audio focus | Request audio focus, duck other audio |

## 7. Android Auto Role

Android Auto is a **platform-specific client surface**, not a separate logic island.

### What Android Auto Shows
- Current tour stop info (address, price, photo)
- Next stop preview
- Tour progress (stop 3 of 7)
- Navigation integration (launch Google Maps / Waze for directions)
- Simple controls: next stop, previous stop, pause narration

### What Android Auto Does NOT Do
- Full search
- Listing browsing
- Lead capture
- Tour planning

### Architecture

```
Flutter App
    │
    ├── Tour State (shared)
    │   ├── Current tour
    │   ├── Active stop
    │   └── Narration payloads
    │
    ├── Geofence Service (native Android)
    │   └── ProximityEvent → Platform Channel → Flutter
    │
    ├── TTS Service (Flutter)
    │   └── NarrationPayload → Speech
    │
    └── Android Auto Surface (native Android)
        ├── CarAppService (Kotlin)
        ├── TourScreen (minimal UI)
        ├── Platform Channel ← Tour state from Flutter
        └── MediaSession (for audio controls)
```

## 8. Flutter / Native Boundary

| Component | Implementation | Why |
|-----------|---------------|-----|
| Tour state management | Flutter (Dart) | Shared with main app |
| Tour UI (phone) | Flutter | Cross-platform |
| Geofencing | Native Android plugin (Kotlin) | GeofencingClient requires native |
| Location tracking | Flutter plugin (geolocator) | Cross-platform |
| TTS | Flutter plugin (flutter_tts) | Cross-platform |
| Android Auto UI | Native Android (Kotlin) | CarAppLibrary is Android-only |
| Platform channels | Dart ↔ Kotlin bridge | Connect Flutter to native |

### Native Android Plugin Needs

A custom Flutter plugin (or platform channel module) is needed for:

1. **Geofencing** — Register/unregister geofences, receive transition events
2. **Android Auto** — CarAppService, Screen, Template rendering
3. **Bridge** — Send tour state to Android Auto, receive geofence events in Flutter

This plugin lives in the mobile app project, not as a separate package initially.

## 9. Implementation Phases

### Phase 8A — Domain Models
- Add `ProximityEvent` and `NarrationPayload` to shared-types
- Add narration generation to tour planning API
- Define platform channel message contracts

### Phase 8B — Geofence Service
- Native Android geofence plugin
- Flutter integration
- Test with mock locations

### Phase 8C — Narration / TTS
- TTS integration in Flutter
- Narration playback triggered by proximity events
- Audio focus management

### Phase 8D — Android Auto Surface
- CarAppService implementation
- Tour screen template
- Platform channel bridge to Flutter tour state
- Media controls for narration
