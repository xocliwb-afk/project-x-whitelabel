import type { Listing as NormalizedListing } from "@project-x/shared-types";

export interface Listing {
  id: string;
  price: number | null;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  beds: number;
  baths: number;
  sqft: number;
  photoUrl: string;
  lat: number;
  lng: number;
  status: NormalizedListing["details"]["status"];
  propertyType: string | null;
  daysOnMarket: number | null;
  neighborhood?: string | null;
}

export function mapNormalizedToListing(l: NormalizedListing): Listing {
  return {
    id: l.id,
    price: l.listPrice ?? null,
    addressLine1: l.address.street,
    city: l.address.city,
    state: l.address.state,
    zip: l.address.zip,
    beds: l.details.beds ?? 0,
    baths: l.details.baths ?? 0,
    sqft: l.details.sqft ?? 0,
    photoUrl: l.media.photos?.[0] ?? "",
    lat: Number(l.address.lat ?? 0),
    lng: Number(l.address.lng ?? 0),
    status: l.details.status,
    propertyType: l.details.propertyType,
    daysOnMarket: l.meta.daysOnMarket,
    neighborhood: null,
  };
}

export function mapNormalizedArrayToListings(
  list: NormalizedListing[]
): Listing[] {
  return list.map(mapNormalizedToListing);
}
