import { ListingProvider } from './listing-provider.interface';
import { ListingSearchParams, NormalizedListing } from '@project-x/shared-types';
import { mockListings } from '../data/mockListings';
import { clampLimit, parseBbox, stableSortListings } from '../utils/listingSearch.util';

/**
 * MockListingProvider uses static in-repo data and maps it into the NormalizedListing shape.
 * This is used for local development and demos without hitting a real IDX/MLS provider.
 */
export class MockListingProvider implements ListingProvider {
  public async search(params: ListingSearchParams): Promise<NormalizedListing[]> {
    const page = params.page && params.page > 0 ? Math.floor(params.page) : 1;
    const limit = clampLimit(params.limit);
    const pageSize = params.clientLimit ? clampLimit(params.clientLimit) : limit;

    // Pre-filter raw data for location fields not in NormalizedListing
    let raws = mockListings.slice();
    if (params.counties && params.counties.length > 0) {
      const lc = params.counties.map((c) => c.toLowerCase());
      raws = raws.filter((r) => {
        const county = (r.address?.county ?? '').toLowerCase();
        return county && lc.includes(county);
      });
    }
    if (params.neighborhoods && params.neighborhoods.length > 0) {
      const lc = params.neighborhoods.map((n) => n.toLowerCase());
      raws = raws.filter((r) => {
        const hood = (r.address?.neighborhood ?? '').toLowerCase();
        return hood && lc.includes(hood);
      });
    }

    let mapped = raws.map((raw) => this.mapToListing(raw));

    if (params.bbox) {
      const { minLng, minLat, maxLng, maxLat } = parseBbox(params.bbox);
      mapped = mapped.filter((l) => {
        const { lat, lng } = l.address ?? {};
        return (
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          lng >= minLng &&
          lng <= maxLng &&
          lat >= minLat &&
          lat <= maxLat
        );
      });
    }

    // Apply filters on mapped NormalizedListing fields
    if (params.status && params.status.length > 0) {
      const statuses = params.status.map((s) => s.toUpperCase());
      mapped = mapped.filter((l) => {
        const ls = (l.details?.status ?? '').toUpperCase();
        return statuses.includes(ls);
      });
    }
    if (params.propertyType) {
      const pt = params.propertyType.toLowerCase();
      mapped = mapped.filter(
        (l) => (l.details?.propertyType ?? '').toLowerCase() === pt,
      );
    }
    if (params.minPrice != null) {
      mapped = mapped.filter((l) => l.listPrice >= params.minPrice!);
    }
    if (params.maxPrice != null) {
      mapped = mapped.filter((l) => l.listPrice <= params.maxPrice!);
    }
    if (params.beds != null) {
      mapped = mapped.filter((l) => (l.details?.beds ?? 0) >= params.beds!);
    }
    if (params.maxBeds != null) {
      mapped = mapped.filter((l) => (l.details?.beds ?? 0) <= params.maxBeds!);
    }
    if (params.baths != null) {
      mapped = mapped.filter((l) => (l.details?.baths ?? 0) >= params.baths!);
    }
    if (params.maxBaths != null) {
      mapped = mapped.filter((l) => (l.details?.baths ?? 0) <= params.maxBaths!);
    }
    if (params.minSqft != null) {
      mapped = mapped.filter((l) => (l.details?.sqft ?? 0) >= params.minSqft!);
    }
    if (params.maxSqft != null) {
      mapped = mapped.filter((l) => (l.details?.sqft ?? 0) <= params.maxSqft!);
    }
    if (params.minYearBuilt != null) {
      mapped = mapped.filter((l) => (l.details?.yearBuilt ?? 0) >= params.minYearBuilt!);
    }
    if (params.maxYearBuilt != null) {
      mapped = mapped.filter((l) => (l.details?.yearBuilt ?? 9999) <= params.maxYearBuilt!);
    }
    if (params.maxDaysOnMarket != null) {
      mapped = mapped.filter(
        (l) => (l.meta?.daysOnMarket ?? Infinity) <= params.maxDaysOnMarket!,
      );
    }
    if (params.cities && params.cities.length > 0) {
      const lc = params.cities.map((c) => c.toLowerCase());
      mapped = mapped.filter((l) => lc.includes((l.address?.city ?? '').toLowerCase()));
    }
    if (params.postalCodes && params.postalCodes.length > 0) {
      mapped = mapped.filter((l) => params.postalCodes!.includes(l.address?.zip ?? ''));
    }
    if (params.keywords) {
      const kw = params.keywords.toLowerCase();
      mapped = mapped.filter((l) => {
        const text = [l.description, l.address?.full, l.details?.propertyType]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return kw.split(',').some((k) => text.includes(k.trim()));
      });
    }

    const sorted = stableSortListings(mapped, params.sort);
    const offset = (page - 1) * pageSize;
    const paged = sorted.slice(offset, offset + limit);

    if (process.env.NODE_ENV !== 'production') {
      const missingPrice = sorted.filter((l) => !Number.isFinite(l.listPrice) || l.listPrice <= 0).length;
      const missingCoords = sorted.filter(
        (l) => !Number.isFinite(l.address.lat) || !Number.isFinite(l.address.lng),
      ).length;
      if (missingPrice || missingCoords) {
        console.warn(
          `[MockListingProvider] mapped ${mapped.length} listings; missing price: ${missingPrice}; missing coords: ${missingCoords}`,
        );
      }
    }

    return paged;
  }

  public async getById(id: string): Promise<NormalizedListing | null> {
    const raw = mockListings.find((item) => item.id === id);

    if (!raw) {
      return null;
    }

    return this.mapToListing(raw);
  }

  /**
   * Maps a raw mock listing into the NormalizedListing DTO.
   * This is intentionally tolerant and uses fallback values for fields that may not exist in the mock.
   */
  private mapToListing(raw: any): NormalizedListing {
    const pickNumber = (...vals: any[]) =>
      vals.find((v) => typeof v === 'number' && Number.isFinite(v)) ?? null;

    const rawPrice = pickNumber(
      raw.listPrice,
      raw.listprice,
      raw.price,
      raw.details?.price,
      raw.details?.listPrice,
      raw.details?.listprice,
    );
    const listPrice: number = rawPrice ?? 0;

    // Handle structured address objects (mock data) and string addresses
    const addrObj = raw.address && typeof raw.address === 'object' ? raw.address : null;
    const rawFull =
      addrObj?.full ??
      (addrObj
        ? [addrObj.street, addrObj.city, addrObj.state && addrObj.zip ? `${addrObj.state} ${addrObj.zip}` : addrObj.state]
            .filter(Boolean)
            .join(', ')
        : null) ??
      (typeof raw.address === 'string' ? raw.address : null) ??
      `${raw.streetName ?? ''} ${raw.streetNumber ?? ''}`.trim();

    const fullAddress =
      typeof rawFull === 'string' && rawFull.trim().length > 0
        ? rawFull
        : 'Unknown address';

    // Extract address parts — prefer structured fields, fall back to string parsing
    let streetPart: string;
    let cityPart: string;
    let statePart: string;
    let zipPart: string;

    if (addrObj) {
      streetPart = addrObj.street ?? fullAddress;
      cityPart = addrObj.city ?? 'Unknown City';
      statePart = addrObj.state ?? 'XX';
      zipPart = addrObj.zip ?? '00000';
    } else {
      const parts = fullAddress.split(',').map((s: string) => s.trim());
      streetPart = parts[0] ?? fullAddress;
      cityPart = parts[1] ?? 'Unknown City';
      const stateZipPart = parts[2] ?? '';
      const stateZipPieces = stateZipPart.split(' ').map((s: string) => s.trim());
      statePart = stateZipPieces[0] ?? 'XX';
      zipPart = stateZipPieces[1] ?? '00000';
    }

    return {
      id: raw.listingId ?? raw.id ?? 'unknown-id',
      mlsId: raw.mlsId ?? 'unknown-mls-id',
      listPrice,
      listPriceFormatted: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(listPrice),
      media: {
        photos: Array.isArray(raw.media?.photos)
          ? raw.media.photos
          : Array.isArray(raw.photos)
          ? raw.photos
          : [],
        thumbnailUrl:
          (Array.isArray(raw.media?.photos) && raw.media.photos[0]) ||
          (Array.isArray(raw.photos) && raw.photos[0]) ||
          null,
      },
      address: {
        full: fullAddress,
        street: streetPart || fullAddress,
        city: cityPart || 'Unknown City',
        state: statePart || 'XX',
        zip: zipPart || '00000',
        lat: pickNumber(raw.address?.lat, raw.coordinates?.lat, raw.geo?.lat, raw.latitude) ?? 0,
        lng: pickNumber(raw.address?.lng, raw.coordinates?.lng, raw.geo?.lng, raw.longitude) ?? 0,
      },
      details: {
        beds: raw.property?.bedrooms ?? raw.details?.beds ?? raw.bedrooms ?? null,
        baths:
          (raw.property?.bathsFull ?? raw.bathsFull ?? 0) +
          (raw.property?.bathsHalf ?? raw.bathsHalf ?? 0) * 0.5,
        sqft: raw.property?.area ?? raw.details?.sqft ?? raw.squareFeet ?? null,
        lotSize: raw.property?.lotSizeArea ?? raw.details?.lotSize ?? raw.lotSize ?? null,
        yearBuilt: raw.property?.yearBuilt ?? raw.details?.yearBuilt ?? raw.yearBuilt ?? null,
        hoaFees: raw.association?.fee ?? raw.hoaFees ?? null,
        basement:
          Array.isArray(raw.property?.basement) && raw.property.basement.length > 0
            ? raw.property.basement.join(', ')
            : raw.basement ?? null,
        propertyType: raw.property?.style ?? raw.property?.type ?? raw.details?.propertyType ?? 'Unknown',
        status: raw.mls?.status ?? raw.status ?? raw.details?.status ?? 'Active',
      },
      meta: {
        daysOnMarket: raw.mls?.daysOnMarket ?? raw.meta?.daysOnMarket ?? null,
        mlsName: raw.mls?.isMls ?? raw.meta?.mlsName ?? 'Mock MLS',
      },
      agent: raw.agent ?? null,
      coAgent: raw.coAgent ?? null,
      office: raw.office ?? null,
      description: raw.description ?? raw.remarks ?? null,
      tax: raw.tax ?? null,
      school: raw.school ?? null,
    };
  }
}
