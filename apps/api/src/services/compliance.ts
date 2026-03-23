import { Listing } from "@project-x/shared-types";

const DEFAULT_DISCLAIMER =
  "Listing information is deemed reliable but not guaranteed and should be independently verified.";

/**
 * Enforces MLS display compliance on a single listing before it reaches clients.
 *
 * Rules applied:
 * 1. Attribution is always present (mlsName + disclaimer).
 * 2. Compensation/commission fields are stripped — never sent to consumers.
 */
export function applyListingCompliance(listing: Listing): Listing {
  // 1. Ensure attribution is always present
  const attribution = {
    mlsName: listing.attribution?.mlsName || "MLS",
    disclaimer: listing.attribution?.disclaimer || DEFAULT_DISCLAIMER,
    logoUrl: listing.attribution?.logoUrl,
  };

  // 2. Strip compensation/commission fields if they leaked through
  //    These are typed as `any` since they shouldn't exist on NormalizedListing
  //    but could be present if raw data leaks.
  const cleaned = { ...listing } as Record<string, unknown>;
  const compensationKeys = [
    "buyerComp",
    "sellerComp",
    "buyerCompensation",
    "sellerCompensation",
    "compensation",
    "commission",
    "buyerAgentCompensation",
    "listingAgentCompensation",
  ];
  for (const key of compensationKeys) {
    delete cleaned[key];
  }

  return {
    ...(cleaned as Listing),
    attribution,
  };
}

export function applyListingsCompliance(list: Listing[]): Listing[] {
  return list.map(applyListingCompliance);
}
