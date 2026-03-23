/**
 * Trigger that caused a narration to fire.
 */
export type NarrationTrigger =
  | "approaching"   // Geofence entry — vehicle nearing a tour stop
  | "arrived"        // At the stop location
  | "departed"       // Left the stop location
  | "manual";        // User-initiated narration request

/**
 * Payload delivered to the TTS engine for a narration event.
 * Contains everything needed to generate a spoken summary for a tour stop.
 */
export interface NarrationPayload {
  /** Tour stop that triggered this narration */
  tourStopId: string;
  /** Listing at this stop */
  listingId: string;
  /** What triggered the narration */
  trigger: NarrationTrigger;
  /** Pre-composed narration text (ready for TTS) */
  narrationText: string;
  /** Structured listing summary for display alongside narration */
  listingSummary?: {
    address: string;
    price: string;
    beds: number | null;
    baths: number | null;
    sqft: number | null;
    highlights?: string[];
  };
  /** Navigation context — where the user is relative to the stop */
  navigationContext?: {
    distanceMeters: number;
    durationSeconds: number;
    /** "next" = upcoming stop, "current" = at stop now */
    relation: "next" | "current";
  };
}

/**
 * Type of proximity event detected by the geofence system.
 */
export type ProximityEventType = "approaching" | "arrived" | "departed";

/**
 * A proximity event fired when the device enters, reaches, or leaves
 * a geofenced area around a tour stop.
 */
export interface ProximityEvent {
  /** Tour this event belongs to */
  tourId: string;
  /** Tour stop that triggered the event */
  tourStopId: string;
  /** Listing at this stop */
  listingId: string;
  /** Type of proximity change */
  type: ProximityEventType;
  /** Device location when the event fired */
  location: {
    lat: number;
    lng: number;
  };
  /** Distance from the stop in meters */
  distanceMeters: number;
  /** ISO 8601 timestamp */
  timestamp: string;
}
