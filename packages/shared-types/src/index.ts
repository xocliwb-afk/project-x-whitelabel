/**
 * The canonical, normalized data transfer object for a single property listing.
 * This shape is used for all API responses to web and mobile clients.
 */
export type NormalizedListing = {
  id: string;
  mlsId: string;
  listPrice: number;
  listPriceFormatted: string;
  address: {
    full: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    county?: string | null;
    neighborhood?: string | null;
    lat: number;
    lng: number;
  };
  media: {
    photos: string[];
    thumbnailUrl?: string | null;
  };
  attribution?: {
    mlsName: string;
    disclaimer: string;
    logoUrl?: string;
  };
  details: {
    beds: number | null;
    baths: number | null;
    sqft: number | null;
    lotSize: number | null;
    yearBuilt: number | null;
    hoaFees: number | null;
    basement: string | null;
    propertyType: string | null;
    status: string;
  };
  meta: {
    daysOnMarket: number | null;
    mlsName: string | null;
  };
  agent?: {
    id?: string | number | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    cellPhone?: string | null;
  } | null;
  coAgent?: {
    id?: string | number | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    cellPhone?: string | null;
  } | null;
  office?: {
    id?: string | number | null;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  description?: string | null;
  tax?: {
    annualAmount?: number | null;
    year?: number | null;
    assessmentId?: string | number | null;
  } | null;
  school?: {
    district?: string | null;
    elementary?: string | null;
    middle?: string | null;
    high?: string | null;
  } | null;
};

/**
 * A semantic alias for the canonical listing DTO.
 * Existing code that imports `Listing` should now receive the normalized shape.
 */
export type Listing = NormalizedListing;

/**
 * Defines the available query parameters for searching listings.
 * This type should be used by the backend for parsing and validating query strings.
 */
export type ListingSearchParams = {
  q?: string;
  bbox?: string; // "minLng,minLat,maxLng,maxLat" (validated server-side)
  page?: number;
  limit?: number;
  /**
   * Internal: original client-requested limit (used for stable paging when providers fetch limit+1)
   */
  clientLimit?: number;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
  propertyType?: string;
  sort?: "price-asc" | "price-desc" | "dom" | "newest";
  status?: string[]; // e.g. ["FOR_SALE", "PENDING"]
  minSqft?: number;
  maxSqft?: number;
  minYearBuilt?: number;
  maxYearBuilt?: number;
  maxDaysOnMarket?: number;
  keywords?: string;
  cities?: string[];
  postalCodes?: string[];
  counties?: string[];
  neighborhoods?: string[];
  features?: string[];
  subtype?: string[];
  agent?: string[];
  brokers?: string[];
  maxBeds?: number;
  maxBaths?: number;
};

/**
 * A standardized error shape for API responses.
 * All error responses from the API should conform to this structure.
 */
export type ApiError = {
  error: true;
  message: string;
  code: string;
  status: number;
};

export type CRMType =
  | 'null'
  | 'webhook'
  | 'hubspot'
  | 'email';

export type CRMConfig = {
  brokerId: string;
  crmType: CRMType;
  webhookUrl?: string;
  webhookSecret?: string;
  apiKey?: string;
  metadata?: Record<string, string | number>;
};

export type LeadPayload = {
  listingId?: string;
  listingAddress?: string;
  message?: string;
  /** Serialized JSON context (max 8192 chars, validated server-side) */
  context?: string;
  name: string;
  email?: string;
  phone?: string;
  brokerId: string;
  agentId?: string;
  source?: string;
  /** reCAPTCHA token — required by API, verified server-side */
  captchaToken?: string;
};

export type LeadResponse = {
  success: boolean;
  provider?: string;
  message?: string;
};

// TEMP: keep contract-safe and serializable. Status / propertyType are strings in the API.
export type ListingStatus = string;
export type PropertyType = string;

/**
 * Pure helper: decides whether the preview card should appear on the right
 * side of the lens, given the map and lens bounding rects.
 * Returns null when rects are missing (caller should fall back to default).
 */
export function computePreviewSide(
  mapRect: { left: number; right: number } | null | undefined,
  lensRect: { left: number; right: number } | null | undefined,
  listOnRight: boolean,
): boolean | null {
  if (!mapRect || !lensRect) return null;
  const previewWidth = 320;
  const gap = 12;
  const spaceRight = mapRect.right - (lensRect.right + gap);
  const spaceLeft = lensRect.left - gap - mapRect.left;
  let final = listOnRight;
  if (listOnRight) {
    if (spaceRight < previewWidth && spaceLeft > spaceRight) {
      final = !(spaceLeft >= previewWidth);
    }
  } else {
    if (spaceLeft < previewWidth && spaceRight > spaceLeft) {
      final = spaceRight >= previewWidth;
    }
  }
  return final;
}

export * from './tour';
export * from './brand';
export * from './narration';
