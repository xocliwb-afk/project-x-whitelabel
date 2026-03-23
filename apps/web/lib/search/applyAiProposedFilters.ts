import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { ReadonlyURLSearchParams } from 'next/navigation';

const STATUS_MAP: Record<string, string> = {
  for_sale: 'FOR_SALE',
  pending: 'PENDING',
  sold: 'SOLD',
};

const PROPERTY_TYPE_MAP: Record<string, string> = {
  house: 'Single Family',
  condo: 'Condo',
  townhome: 'Townhome',
  land: 'Land',
  multi_family: 'Multi-Family',
};

type ApplyParams = {
  proposedFilters: Record<string, any>;
  router: AppRouterInstance;
  pathname: string;
  searchParams: ReadonlyURLSearchParams;
};

export function applyAiProposedFilters({ proposedFilters, router, pathname, searchParams }: ApplyParams) {
  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams(searchParams.toString());

  const applyField = (key: string, value: any) => {
    if (value == null || value === '') {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  };

  if (proposedFilters.status) {
    const mapped = STATUS_MAP[proposedFilters.status] || proposedFilters.status;
    applyField('status', mapped);
  }

  if (proposedFilters.propertyType) {
    const mapped = PROPERTY_TYPE_MAP[proposedFilters.propertyType] || proposedFilters.propertyType;
    applyField('propertyType', mapped);
  }

  if (proposedFilters.minPrice != null) applyField('minPrice', proposedFilters.minPrice);
  if (proposedFilters.maxPrice != null) applyField('maxPrice', proposedFilters.maxPrice);
  if (proposedFilters.bedsMin != null) applyField('beds', proposedFilters.bedsMin);
  if (proposedFilters.bathsMin != null) applyField('baths', proposedFilters.bathsMin);
  if (proposedFilters.city) applyField('city', proposedFilters.city);
  if (proposedFilters.zip) applyField('zip', proposedFilters.zip);
  if (proposedFilters.keywords && Array.isArray(proposedFilters.keywords)) {
    const joined = proposedFilters.keywords.filter(Boolean).join(',');
    if (joined) applyField('keywords', joined);
  }

  router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, {
    scroll: false,
  });
}
