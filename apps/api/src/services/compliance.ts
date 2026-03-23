import { Listing } from "@project-x/shared-types";

export function applyListingCompliance(raw: Listing): Listing {
  return raw;
}

export function applyListingsCompliance(list: Listing[]): Listing[] {
  return list.map(applyListingCompliance);
}
