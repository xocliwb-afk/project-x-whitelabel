import { describe, it, expect } from 'vitest';
import { hasAnyNonPagingFilter } from '../../utils/listingSearch.util';
import { MockListingProvider } from '../../providers/mock-listing.provider';
import type { ListingSearchParams } from '@project-x/shared-types';

describe('hasAnyNonPagingFilter', () => {
  it('returns false for empty params', () => {
    expect(hasAnyNonPagingFilter({})).toBe(false);
  });

  it('returns false for page/limit only', () => {
    expect(hasAnyNonPagingFilter({ page: 2, limit: 50 })).toBe(false);
  });

  it('returns true for original scalar filters', () => {
    expect(hasAnyNonPagingFilter({ minPrice: 100000 })).toBe(true);
    expect(hasAnyNonPagingFilter({ maxPrice: 500000 })).toBe(true);
    expect(hasAnyNonPagingFilter({ beds: 3 })).toBe(true);
    expect(hasAnyNonPagingFilter({ baths: 2 })).toBe(true);
    expect(hasAnyNonPagingFilter({ propertyType: 'Condo' })).toBe(true);
    expect(hasAnyNonPagingFilter({ status: ['FOR_SALE'] })).toBe(true);
    expect(hasAnyNonPagingFilter({ minSqft: 1000 })).toBe(true);
    expect(hasAnyNonPagingFilter({ maxSqft: 3000 })).toBe(true);
    expect(hasAnyNonPagingFilter({ minYearBuilt: 2000 })).toBe(true);
    expect(hasAnyNonPagingFilter({ maxYearBuilt: 2020 })).toBe(true);
    expect(hasAnyNonPagingFilter({ maxDaysOnMarket: 30 })).toBe(true);
    expect(hasAnyNonPagingFilter({ keywords: 'pool' })).toBe(true);
    expect(hasAnyNonPagingFilter({ bbox: '-85,42,-84,43' })).toBe(true);
    expect(hasAnyNonPagingFilter({ q: 'Grand Rapids' })).toBe(true);
  });

  it('returns true for extended location filters (previously missing)', () => {
    expect(hasAnyNonPagingFilter({ cities: ['Grand Rapids'] })).toBe(true);
    expect(hasAnyNonPagingFilter({ postalCodes: ['49503'] })).toBe(true);
    expect(hasAnyNonPagingFilter({ counties: ['Kent'] })).toBe(true);
    expect(hasAnyNonPagingFilter({ neighborhoods: ['East Hills'] })).toBe(true);
    expect(hasAnyNonPagingFilter({ features: ['Pool'] })).toBe(true);
    expect(hasAnyNonPagingFilter({ subtype: ['Townhouse'] })).toBe(true);
    expect(hasAnyNonPagingFilter({ agent: ['ag-123'] })).toBe(true);
    expect(hasAnyNonPagingFilter({ brokers: ['ofc-42'] })).toBe(true);
    expect(hasAnyNonPagingFilter({ maxBeds: 4 })).toBe(true);
    expect(hasAnyNonPagingFilter({ maxBaths: 3 })).toBe(true);
  });

  it('returns false for empty arrays', () => {
    expect(hasAnyNonPagingFilter({ cities: [] })).toBe(false);
    expect(hasAnyNonPagingFilter({ postalCodes: [] })).toBe(false);
    expect(hasAnyNonPagingFilter({ status: [] })).toBe(false);
  });
});

describe('MockListingProvider filtering', () => {
  const provider = new MockListingProvider();

  it('returns all listings with no filters', async () => {
    const results = await provider.search({});
    expect(results.length).toBe(4);
  });

  it('filters by status', async () => {
    const results = await provider.search({ status: ['FOR_SALE'] });
    expect(results.length).toBe(2);
    results.forEach((r) => {
      expect(r.details?.status?.toUpperCase()).toBe('FOR_SALE');
    });
  });

  it('filters by propertyType', async () => {
    const results = await provider.search({ propertyType: 'Condo' });
    expect(results.length).toBe(1);
    expect(results[0].details?.propertyType).toBe('Condo');
  });

  it('filters by minPrice', async () => {
    const results = await provider.search({ minPrice: 400000 });
    results.forEach((r) => {
      expect(r.listPrice).toBeGreaterThanOrEqual(400000);
    });
  });

  it('filters by maxPrice', async () => {
    const results = await provider.search({ maxPrice: 350000 });
    results.forEach((r) => {
      expect(r.listPrice).toBeLessThanOrEqual(350000);
    });
  });

  it('filters by beds (min)', async () => {
    const results = await provider.search({ beds: 4 });
    results.forEach((r) => {
      expect(r.details?.beds).toBeGreaterThanOrEqual(4);
    });
  });

  it('filters by maxBeds', async () => {
    const results = await provider.search({ maxBeds: 3 });
    results.forEach((r) => {
      expect(r.details?.beds).toBeLessThanOrEqual(3);
    });
  });

  it('filters by cities', async () => {
    const results = await provider.search({ cities: ['Grand Rapids'] });
    expect(results.length).toBe(4);
    results.forEach((r) => {
      expect(r.address.city).toBe('Grand Rapids');
    });
  });

  it('filters by postalCodes', async () => {
    const results = await provider.search({ postalCodes: ['49503'] });
    expect(results.length).toBe(1);
    expect(results[0].address.zip).toBe('49503');
  });

  it('filters by counties', async () => {
    const results = await provider.search({ counties: ['Kent'] });
    expect(results.length).toBe(4);
  });

  it('filters by neighborhoods', async () => {
    const results = await provider.search({ neighborhoods: ['Heritage Hill'] });
    expect(results.length).toBe(1);
  });

  it('filters by maxDaysOnMarket', async () => {
    const results = await provider.search({ maxDaysOnMarket: 10 });
    results.forEach((r) => {
      expect(r.meta?.daysOnMarket).toBeLessThanOrEqual(10);
    });
  });

  it('filters by minYearBuilt', async () => {
    const results = await provider.search({ minYearBuilt: 2000 });
    results.forEach((r) => {
      expect(r.details?.yearBuilt).toBeGreaterThanOrEqual(2000);
    });
  });

  it('filters by keywords', async () => {
    const results = await provider.search({ keywords: 'condo' });
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('maps city and zip correctly from structured mock address', async () => {
    const results = await provider.search({});
    const first = results[0];
    expect(first.address.city).toBe('Grand Rapids');
    expect(first.address.zip).not.toBe('00000');
    expect(first.address.state).toBe('MI');
  });

  it('supports paging with bbox-less filtered query', async () => {
    const page1 = await provider.search({ status: ['FOR_SALE'], limit: 1, page: 1 });
    const page2 = await provider.search({ status: ['FOR_SALE'], limit: 1, page: 2 });
    expect(page1.length).toBe(1);
    expect(page2.length).toBe(1);
    expect(page1[0].id).not.toBe(page2[0].id);
  });

  it('combines multiple filters', async () => {
    const results = await provider.search({
      status: ['FOR_SALE'],
      minPrice: 200000,
      maxPrice: 400000,
    });
    results.forEach((r) => {
      expect(r.details?.status?.toUpperCase()).toBe('FOR_SALE');
      expect(r.listPrice).toBeGreaterThanOrEqual(200000);
      expect(r.listPrice).toBeLessThanOrEqual(400000);
    });
  });
});
