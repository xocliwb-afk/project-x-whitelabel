import { ListingProvider } from '../providers/listing-provider.interface';
import { MockListingProvider } from '../providers/mock-listing.provider';
import { SimplyRetsListingProvider } from '../providers/simplyrets.provider';

const mockProvider = new MockListingProvider();
let simplyRetsProvider: SimplyRetsListingProvider | null = null;

export function getListingProvider(): ListingProvider {
  const providerName = process.env.DATA_PROVIDER?.toLowerCase();
  const allowedProviders = new Set(['mock', 'simplyrets', undefined]);

  if (!allowedProviders.has(providerName)) {
    throw new Error(`Unsupported DATA_PROVIDER value "${providerName}". Allowed: mock, simplyrets.`);
  }

  switch (providerName) {
    case 'simplyrets': {
      if (!simplyRetsProvider) {
        simplyRetsProvider = new SimplyRetsListingProvider();
      }
      return simplyRetsProvider;
    }
    case 'mock':
    case undefined:
    default:
      return mockProvider;
  }
}
