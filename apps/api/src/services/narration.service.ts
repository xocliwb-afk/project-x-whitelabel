import type { NormalizedListing, TourStop, Tour, NarrationPayload } from '@project-x/shared-types';

/**
 * Generate a rich narration payload for a single tour stop,
 * using listing data when available.
 */
export function generateNarrationForStop(
  tourStop: TourStop,
  listing: NormalizedListing | null,
): NarrationPayload {
  const narrationText = listing
    ? buildRichNarration(tourStop, listing)
    : buildBasicNarration(tourStop);

  const listingSummary = listing
    ? {
        address: listing.address.full,
        price: listing.listPriceFormatted || formatPrice(listing.listPrice),
        beds: listing.details.beds,
        baths: listing.details.baths,
        sqft: listing.details.sqft,
        highlights: buildHighlights(listing),
      }
    : {
        address: tourStop.address,
        price: '',
        beds: null,
        baths: null,
        sqft: null,
      };

  return {
    tourStopId: tourStop.id,
    listingId: tourStop.listingId,
    trigger: 'approaching',
    narrationText,
    listingSummary,
  };
}

/**
 * Generate narration payloads for all stops in a tour.
 * Matches stops to listings by listingId when available.
 */
export function generateTourNarrations(
  tour: Tour,
  listings: Map<string, NormalizedListing>,
): NarrationPayload[] {
  return tour.stops.map((stop) => {
    const listing = listings.get(stop.listingId) ?? null;
    return generateNarrationForStop(stop, listing);
  });
}

function buildRichNarration(stop: TourStop, listing: NormalizedListing): string {
  const parts: string[] = [];

  parts.push(`Approaching ${stop.address}.`);

  const price = listing.listPriceFormatted || formatPrice(listing.listPrice);
  parts.push(`This property is listed at ${price}.`);

  const detailParts: string[] = [];
  if (listing.details.beds != null) {
    detailParts.push(`${listing.details.beds} bedroom${listing.details.beds !== 1 ? 's' : ''}`);
  }
  if (listing.details.baths != null) {
    detailParts.push(`${listing.details.baths} bathroom${listing.details.baths !== 1 ? 's' : ''}`);
  }
  if (listing.details.sqft != null && listing.details.sqft > 0) {
    detailParts.push(`${listing.details.sqft.toLocaleString()} square feet`);
  }
  if (detailParts.length > 0) {
    parts.push(`It has ${detailParts.join(', ')}.`);
  }

  if (listing.details.propertyType) {
    parts.push(`Property type: ${listing.details.propertyType}.`);
  }

  if (listing.details.yearBuilt != null && listing.details.yearBuilt > 0) {
    parts.push(`Built in ${listing.details.yearBuilt}.`);
  }

  if (listing.meta.daysOnMarket != null && listing.meta.daysOnMarket > 0) {
    parts.push(`On market for ${listing.meta.daysOnMarket} days.`);
  }

  const highlights = buildHighlights(listing);
  if (highlights.length > 0) {
    parts.push(`Notable features: ${highlights.join(', ')}.`);
  }

  return parts.join(' ');
}

function buildBasicNarration(stop: TourStop): string {
  return `Approaching ${stop.address}.`;
}

function buildHighlights(listing: NormalizedListing): string[] {
  const highlights: string[] = [];

  if (listing.details.lotSize != null && listing.details.lotSize > 0) {
    highlights.push(`${listing.details.lotSize} acre lot`);
  }
  if (listing.details.basement) {
    highlights.push(`${listing.details.basement} basement`);
  }
  if (listing.details.hoaFees != null && listing.details.hoaFees > 0) {
    highlights.push(`HOA $${listing.details.hoaFees}/mo`);
  }

  return highlights;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}
