import type { NormalizedListing as SharedNormalizedListing } from "@project-x/shared-types";

export interface Listing {
  id: string;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  neighborhood?: string;
  region: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  lat: number;
  lng: number;
  photoUrl: string;
  status: "FOR_SALE" | "PENDING" | "SOLD";
  daysOnMarket: number;
}

export interface ListingDetail extends Listing {
  photos: string[];
  description: string;
  yearBuilt: number;
  lotSize: number;
  propertyType: string;
  mlsId: string;
}

export interface SearchFilters {
  location: string;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
  baths?: number;
}

export type NormalizedListing = SharedNormalizedListing;