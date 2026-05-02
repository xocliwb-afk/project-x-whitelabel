import type { NormalizedListing, Tour, TourStop } from '@project-x/shared-types';
import { describe, expect, it, vi } from 'vitest';
import {
  fetchListingsForTourStops,
  generateTourNarrations,
  MAX_NARRATION_LISTING_ENRICHMENT,
} from '../narration.service';

function makeStop(id: string, listingId: string, order: number): TourStop {
  return {
    id,
    listingId,
    order,
    address: `${order + 1} Main St`,
    lat: 42.3314 + order,
    lng: -83.0458 - order,
    thumbnailUrl: null,
    startTime: `2026-03-23T1${order}:00:00.000Z`,
    endTime: `2026-03-23T1${order}:30:00.000Z`,
  };
}

function makeListing(id: string): NormalizedListing {
  return {
    id,
    mlsId: id,
    listPrice: 250000,
    listPriceFormatted: '$250,000',
    address: {
      full: `Enriched ${id}`,
      street: `Enriched ${id}`,
      city: 'Detroit',
      state: 'MI',
      zip: '48226',
      lat: 42.3314,
      lng: -83.0458,
    },
    media: {
      photos: [],
      thumbnailUrl: null,
    },
    details: {
      beds: 3,
      baths: 2,
      sqft: 1500,
      lotSize: null,
      yearBuilt: null,
      hoaFees: null,
      basement: null,
      propertyType: 'House',
      status: 'Active',
    },
    meta: {
      daysOnMarket: null,
      mlsName: null,
    },
    description: null,
  };
}

function makeTour(stops: TourStop[]): Tour {
  return {
    id: 'tour-1',
    title: 'Tour',
    clientName: '',
    date: '2026-03-23',
    startTime: '09:00',
    defaultDurationMinutes: 30,
    defaultBufferMinutes: 10,
    stops,
    narrationPayloads: [],
  };
}

describe('narration enrichment', () => {
  it('fetches each repeated listingId once and preserves output order for every stop', async () => {
    const stops = [
      makeStop('stop-1', 'listing-a', 0),
      makeStop('stop-2', 'listing-a', 1),
      makeStop('stop-3', 'listing-b', 2),
    ];
    const getListingById = vi.fn(async (listingId: string) => makeListing(listingId));

    const listings = await fetchListingsForTourStops(stops, getListingById);
    const narrations = generateTourNarrations(makeTour(stops), listings);

    expect(getListingById.mock.calls.map(([listingId]) => listingId)).toEqual([
      'listing-a',
      'listing-b',
    ]);
    expect(narrations.map((payload) => payload.tourStopId)).toEqual([
      'stop-1',
      'stop-2',
      'stop-3',
    ]);
    expect(narrations.map((payload) => payload.listingId)).toEqual([
      'listing-a',
      'listing-a',
      'listing-b',
    ]);
    expect(narrations.map((payload) => payload.listingSummary?.address)).toEqual([
      'Enriched listing-a',
      'Enriched listing-a',
      'Enriched listing-b',
    ]);
  });

  it('omits missing or failed listing lookups without crashing narration generation', async () => {
    const stops = [
      makeStop('stop-1', 'listing-a', 0),
      makeStop('stop-2', 'listing-b', 1),
      makeStop('stop-3', 'listing-c', 2),
    ];
    const getListingById = vi.fn(async (listingId: string) => {
      if (listingId === 'listing-a') {
        return makeListing(listingId);
      }
      if (listingId === 'listing-b') {
        return null;
      }
      throw new Error('provider failed');
    });

    const listings = await fetchListingsForTourStops(stops, getListingById);
    const narrations = generateTourNarrations(makeTour(stops), listings);

    expect(listings.has('listing-a')).toBe(true);
    expect(listings.has('listing-b')).toBe(false);
    expect(listings.has('listing-c')).toBe(false);
    expect(narrations).toHaveLength(3);
    expect(narrations[0].listingSummary?.address).toBe('Enriched listing-a');
    expect(narrations[1].listingSummary).toMatchObject({
      address: '2 Main St',
      price: '',
      beds: null,
      baths: null,
      sqft: null,
    });
    expect(narrations[2].listingSummary).toMatchObject({
      address: '3 Main St',
      price: '',
      beds: null,
      baths: null,
      sqft: null,
    });
  });

  it('bounds listing enrichment to the narration listing cap', async () => {
    const stops = Array.from({ length: MAX_NARRATION_LISTING_ENRICHMENT + 3 }, (_, index) =>
      makeStop(`stop-${index}`, `listing-${index}`, index),
    );
    const getListingById = vi.fn(async (listingId: string) => makeListing(listingId));

    const listings = await fetchListingsForTourStops(stops, getListingById);

    expect(getListingById).toHaveBeenCalledTimes(MAX_NARRATION_LISTING_ENRICHMENT);
    expect(listings.size).toBe(MAX_NARRATION_LISTING_ENRICHMENT);
    expect(getListingById).not.toHaveBeenCalledWith(
      `listing-${MAX_NARRATION_LISTING_ENRICHMENT}`,
    );
  });
});
