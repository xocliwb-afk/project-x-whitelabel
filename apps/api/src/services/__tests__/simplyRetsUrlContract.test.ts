import { describe, it, expect } from 'vitest';

// Set credentials before importing provider so constructor doesn't throw
process.env.SIMPLYRETS_USERNAME = 'test';
process.env.SIMPLYRETS_PASSWORD = 'test';

import { SimplyRetsListingProvider } from '../../providers/simplyrets.provider';

const provider = new SimplyRetsListingProvider();

const getParams = (url: URL) => url.searchParams;
const getAll = (url: URL, key: string) => url.searchParams.getAll(key);

describe('SimplyRetsListingProvider.buildSearchUrl', () => {
  describe('extended location filters', () => {
    it('forwards cities as repeated params', () => {
      const url = provider.buildSearchUrl({ cities: ['Grand Rapids', 'Detroit'] });
      expect(getAll(url, 'cities')).toEqual(['Grand Rapids', 'Detroit']);
    });

    it('forwards postalCodes as repeated params', () => {
      const url = provider.buildSearchUrl({ postalCodes: ['49503', '48201'] });
      expect(getAll(url, 'postalCodes')).toEqual(['49503', '48201']);
    });

    it('forwards counties as repeated params', () => {
      const url = provider.buildSearchUrl({ counties: ['Kent', 'Wayne'] });
      expect(getAll(url, 'counties')).toEqual(['Kent', 'Wayne']);
    });

    it('forwards neighborhoods as repeated params', () => {
      const url = provider.buildSearchUrl({ neighborhoods: ['East Hills', 'Heritage Hill'] });
      expect(getAll(url, 'neighborhoods')).toEqual(['East Hills', 'Heritage Hill']);
    });

    it('skips empty arrays', () => {
      const url = provider.buildSearchUrl({ cities: [], postalCodes: [], counties: [] });
      expect(getParams(url).has('cities')).toBe(false);
      expect(getParams(url).has('postalCodes')).toBe(false);
      expect(getParams(url).has('counties')).toBe(false);
    });

    it('trims whitespace from array values', () => {
      const url = provider.buildSearchUrl({ cities: ['  Grand Rapids  ', ' '] });
      expect(getAll(url, 'cities')).toEqual(['Grand Rapids']);
    });
  });

  describe('property detail filters', () => {
    it('forwards features as repeated params', () => {
      const url = provider.buildSearchUrl({ features: ['Pool', 'Garage'] });
      expect(getAll(url, 'features')).toEqual(['Pool', 'Garage']);
    });

    it('forwards subtype as repeated params', () => {
      const url = provider.buildSearchUrl({ subtype: ['Townhouse', 'Duplex'] });
      expect(getAll(url, 'subtype')).toEqual(['Townhouse', 'Duplex']);
    });
  });

  describe('propertyType mapping', () => {
    it('maps Single Family to residential', () => {
      const url = provider.buildSearchUrl({ propertyType: 'Single Family' });
      expect(getParams(url).get('type')).toBe('residential');
    });

    it('maps Condo to condominium', () => {
      const url = provider.buildSearchUrl({ propertyType: 'Condo' });
      expect(getParams(url).get('type')).toBe('condominium');
    });

    it('maps Multi-Family to multifamily', () => {
      const url = provider.buildSearchUrl({ propertyType: 'Multi-Family' });
      expect(getParams(url).get('type')).toBe('multifamily');
    });

    it('maps Land to land', () => {
      const url = provider.buildSearchUrl({ propertyType: 'Land' });
      expect(getParams(url).get('type')).toBe('land');
    });

    it('passes through unmapped values (e.g. direct SimplyRETS enum)', () => {
      const url = provider.buildSearchUrl({ propertyType: 'commercial' });
      expect(getParams(url).get('type')).toBe('commercial');
    });

    it('omits type param when propertyType is undefined', () => {
      const url = provider.buildSearchUrl({});
      expect(getParams(url).has('type')).toBe(false);
    });
  });

  describe('agent/broker filters', () => {
    it('forwards agent as repeated params', () => {
      const url = provider.buildSearchUrl({ agent: ['ag-123'] });
      expect(getAll(url, 'agent')).toEqual(['ag-123']);
    });

    it('forwards brokers as repeated params', () => {
      const url = provider.buildSearchUrl({ brokers: ['ofc-42', 'ofc-99'] });
      expect(getAll(url, 'brokers')).toEqual(['ofc-42', 'ofc-99']);
    });
  });

  describe('scalar range filters', () => {
    it('maps maxBeds to lowercase maxbeds', () => {
      const url = provider.buildSearchUrl({ maxBeds: 4 });
      expect(getParams(url).get('maxbeds')).toBe('4');
      expect(getParams(url).has('maxBeds')).toBe(false);
    });

    it('maps maxBaths to lowercase maxbaths', () => {
      const url = provider.buildSearchUrl({ maxBaths: 3 });
      expect(getParams(url).get('maxbaths')).toBe('3');
      expect(getParams(url).has('maxBaths')).toBe(false);
    });

    it('maps beds to minbeds', () => {
      const url = provider.buildSearchUrl({ beds: 3 });
      expect(getParams(url).get('minbeds')).toBe('3');
    });

    it('maps baths to minbaths', () => {
      const url = provider.buildSearchUrl({ baths: 2 });
      expect(getParams(url).get('minbaths')).toBe('2');
    });

    it('maps minPrice/maxPrice to lowercase', () => {
      const url = provider.buildSearchUrl({ minPrice: 200000, maxPrice: 500000 });
      expect(getParams(url).get('minprice')).toBe('200000');
      expect(getParams(url).get('maxprice')).toBe('500000');
    });

    it('maps sqft to area', () => {
      const url = provider.buildSearchUrl({ minSqft: 1000, maxSqft: 3000 });
      expect(getParams(url).get('minarea')).toBe('1000');
      expect(getParams(url).get('maxarea')).toBe('3000');
    });

    it('maps yearBuilt to year', () => {
      const url = provider.buildSearchUrl({ minYearBuilt: 2000, maxYearBuilt: 2020 });
      expect(getParams(url).get('minyear')).toBe('2000');
      expect(getParams(url).get('maxyear')).toBe('2020');
    });

    it('maps maxDaysOnMarket to maxdom', () => {
      const url = provider.buildSearchUrl({ maxDaysOnMarket: 30 });
      expect(getParams(url).get('maxdom')).toBe('30');
    });
  });

  describe('status mapping', () => {
    it('maps FOR_SALE to Active', () => {
      const url = provider.buildSearchUrl({ status: ['FOR_SALE'] });
      expect(getAll(url, 'status')).toEqual(['Active']);
    });

    it('maps PENDING to Pending', () => {
      const url = provider.buildSearchUrl({ status: ['PENDING'] });
      expect(getAll(url, 'status')).toEqual(['Pending']);
    });

    it('maps SOLD to Closed', () => {
      const url = provider.buildSearchUrl({ status: ['SOLD'] });
      expect(getAll(url, 'status')).toEqual(['Closed']);
    });

    it('passes through unmapped status values', () => {
      const url = provider.buildSearchUrl({ status: ['ActiveUnderContract'] });
      expect(getAll(url, 'status')).toEqual(['ActiveUnderContract']);
    });

    it('supports multiple statuses', () => {
      const url = provider.buildSearchUrl({ status: ['FOR_SALE', 'PENDING'] });
      expect(getAll(url, 'status')).toEqual(['Active', 'Pending']);
    });
  });

  describe('sort mapping', () => {
    it('maps price-asc to listprice', () => {
      const url = provider.buildSearchUrl({ sort: 'price-asc' });
      expect(getParams(url).get('sort')).toBe('listprice');
    });

    it('maps price-desc to -listprice', () => {
      const url = provider.buildSearchUrl({ sort: 'price-desc' });
      expect(getParams(url).get('sort')).toBe('-listprice');
    });

    it('maps newest to -listdate', () => {
      const url = provider.buildSearchUrl({ sort: 'newest' });
      expect(getParams(url).get('sort')).toBe('-listdate');
    });

    it('omits sort param for dom (no SimplyRETS equivalent)', () => {
      const url = provider.buildSearchUrl({ sort: 'dom' });
      expect(getParams(url).has('sort')).toBe(false);
    });
  });

  describe('bbox to points conversion', () => {
    it('converts bbox to 4 lat,lng points', () => {
      const url = provider.buildSearchUrl({ bbox: '-85.72,42.94,-85.62,42.99' });
      const points = getAll(url, 'points');
      expect(points).toEqual([
        '42.94,-85.72',
        '42.94,-85.62',
        '42.99,-85.62',
        '42.99,-85.72',
      ]);
    });

    it('skips invalid bbox', () => {
      const url = provider.buildSearchUrl({ bbox: 'invalid' });
      expect(getParams(url).has('points')).toBe(false);
    });
  });

  describe('pagination', () => {
    it('sets limit', () => {
      const url = provider.buildSearchUrl({ limit: 50 });
      expect(getParams(url).get('limit')).toBe('50');
    });

    it('calculates offset from page and clientLimit', () => {
      const url = provider.buildSearchUrl({ page: 3, limit: 21, clientLimit: 20 });
      // offset = (3 - 1) * 20 = 40
      expect(getParams(url).get('offset')).toBe('40');
    });

    it('does not set offset for page 1', () => {
      const url = provider.buildSearchUrl({ page: 1, limit: 20 });
      expect(getParams(url).has('offset')).toBe(false);
    });
  });

  describe('q parameter', () => {
    it('forwards q as scalar', () => {
      const url = provider.buildSearchUrl({ q: 'Grand Rapids' });
      expect(getParams(url).get('q')).toBe('Grand Rapids');
    });

    it('omits q when empty', () => {
      const url = provider.buildSearchUrl({ q: undefined });
      expect(getParams(url).has('q')).toBe(false);
    });
  });

  describe('combined filters', () => {
    it('builds correct URL with multiple filter types', () => {
      const url = provider.buildSearchUrl({
        cities: ['Grand Rapids'],
        status: ['FOR_SALE'],
        minPrice: 200000,
        maxPrice: 500000,
        beds: 3,
        maxBeds: 5,
        sort: 'price-desc',
        limit: 21,
        bbox: '-85.72,42.94,-85.62,42.99',
      });
      expect(getAll(url, 'cities')).toEqual(['Grand Rapids']);
      expect(getAll(url, 'status')).toEqual(['Active']);
      expect(getParams(url).get('minprice')).toBe('200000');
      expect(getParams(url).get('maxprice')).toBe('500000');
      expect(getParams(url).get('minbeds')).toBe('3');
      expect(getParams(url).get('maxbeds')).toBe('5');
      expect(getParams(url).get('sort')).toBe('-listprice');
      expect(getParams(url).get('limit')).toBe('21');
      expect(getAll(url, 'points').length).toBe(4);
    });
  });
});
