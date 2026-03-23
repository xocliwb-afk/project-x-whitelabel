import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import BackButton from '@/components/BackButton';
import ListingImageGallery from '@/components/ListingImageGallery';
import ContactAgentPanel from '@/components/listing-detail/ContactAgentPanel';
import SiteFooter from '@/components/footer/SiteFooter';
import {
  formatAddressFull,
  formatAttribution,
  formatBasement,
  formatDaysOnMarketFull,
  formatHOAFees,
  formatLotSize,
  formatPrice,
  formatPropertyType,
  formatSqft,
  formatStatus,
  formatYearBuilt,
  getListingDetailsRows,
  getStatusBadgeClasses,
  normalizeRemarks,
} from '@/lib/listingFormat';

type ListingDetailPageProps = {
  params: {
    id: string;
  };
};

export async function generateMetadata({ params }: ListingDetailPageProps): Promise<Metadata> {
  try {
    const listingResponse = await fetchListingForPage(params.id);
    const listing = listingResponse?.listing;
    const street =
      typeof listing?.address?.street === 'string' ? listing.address.street.trim() : '';
    if (street) return { title: street };

    const city = typeof listing?.address?.city === 'string' ? listing.address.city.trim() : '';
    if (city) return { title: `${city} Listing` };

    return { title: 'Listing Details' };
  } catch {
    return { title: 'Listing Details' };
  }
}

function getRequestOrigin() {
  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return host ? `${proto}://${host}` : 'http://localhost:3000';
}

async function fetchListingForPage(id: string) {
  const origin = getRequestOrigin();
  const url = `${origin}/api/listings/${encodeURIComponent(id)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch listing ${id}: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as { listing: any };
}

const formatLabel = (key: string) =>
  key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());

const formatValue = (value: unknown): string => {
  if (value == null) return '';
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString() : '';
  if (typeof value === 'string') return value.trim();
  return '';
};

function renderKeyValueSection(
  title: string,
  obj: Record<string, any> | null | undefined,
  omitKeys: string[] = [],
) {
  if (!obj) return null;
  const omit = new Set(omitKeys);
  const items = Object.entries(obj)
    .filter(([key]) => !omit.has(key))
    .map(([key, value]) => {
      const formatted = formatValue(value);
      if (!formatted) return null;
      return { key: formatLabel(key), value: formatted };
    })
    .filter(Boolean) as { key: string; value: string }[];

  if (!items.length) return null;

  return (
    <section className="rounded-2xl border border-border bg-white/80 p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-text-main">{title}</h2>
      <dl className="mt-4 grid grid-cols-1 gap-4 text-sm text-text-main sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.key} className="rounded-lg bg-surface-muted/60 p-3">
            <dt className="text-[11px] uppercase tracking-wide text-text-muted">{item.key}</dt>
            <dd className="mt-1 text-base font-semibold text-text-main">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const InlineMap = dynamic(() => import('@/components/map/mapbox/MapboxMap'), {
  ssr: false,
});

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  let listingResponse;
  try {
    listingResponse = await fetchListingForPage(params.id);
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.includes('404')) {
      notFound();
    }
    throw error;
  }

  const { listing } = listingResponse;
  const photos = listing.media?.photos ?? [];

  const beds = listing.details?.beds ?? null;
  const baths = listing.details?.baths ?? null;
  const sqft = formatSqft(listing.details?.sqft ?? null);
  const lotSize = formatLotSize(listing.details?.lotSize ?? null);
  const yearBuilt = formatYearBuilt(listing.details?.yearBuilt ?? null);
  const hoa = formatHOAFees(listing.details?.hoaFees ?? null);
  const basement = formatBasement(listing.details?.basement ?? null);
  const propertyType = formatPropertyType(listing.details?.propertyType ?? null);
  const status = listing.details?.status ?? null;
  const statusLabel = formatStatus(status);
  const statusClass = getStatusBadgeClasses(status);
  const domLabel = formatDaysOnMarketFull(listing.meta?.daysOnMarket ?? null);
  const priceLabel = formatPrice(listing);
  const listingAddressFull = formatAddressFull(listing);
  const description = normalizeRemarks((listing as any)?.description ?? listing.description ?? null);
  const detailRows = getListingDetailsRows(listing);
  const attribution = formatAttribution(listing);

  const mapListing = {
    ...listing,
    id: listing.id,
  };

  return (
    <div className="min-h-screen w-full bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <BackButton />
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-white/80 p-4 shadow-sm">
          <ListingImageGallery photos={photos} listing={listing} />
          {description && (
            <section className="rounded-2xl bg-white/80 p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-text-main">Description</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-text-muted">
                {description}
              </p>
            </section>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {statusLabel && (
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusClass}`}>
                  {statusLabel}
                </span>
              )}
              {domLabel && (
                <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-text-muted">
                  {domLabel}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-text-main sm:text-4xl">{priceLabel}</h1>
            <p className="text-lg text-text-main/80">{listingAddressFull}</p>
            <p className="text-xs uppercase tracking-wide text-text-muted whitespace-pre-line">
              {attribution}
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="order-2 space-y-8 lg:order-1">
            <section className="rounded-2xl border border-border bg-white/80 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-text-main">Key Facts</h2>
              <dl className="mt-4 grid grid-cols-2 gap-4 text-sm text-text-main sm:grid-cols-3">
                <Fact label="Status" value={statusLabel ?? '--'} />
                <Fact label="Days on Market" value={domLabel ?? '--'} />
                <Fact label="Beds" value={beds ?? '--'} />
                <Fact label="Baths" value={baths ?? '--'} />
                <Fact label="Square Feet" value={sqft ?? '--'} />
                <Fact label="Lot Size" value={lotSize ?? '--'} />
                <Fact label="Year Built" value={yearBuilt ?? '--'} />
                <Fact label="Property Type" value={propertyType ?? '--'} />
                <Fact label="HOA" value={hoa ?? '--'} />
                <Fact label="Basement" value={basement ?? '--'} />
              </dl>
            </section>

            {detailRows.length > 0 && (
              <section className="rounded-2xl border border-border bg-white/80 p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-text-main">Agent &amp; Office Information</h2>
                <dl className="mt-4 grid grid-cols-1 gap-4 text-sm text-text-main sm:grid-cols-2">
                  {detailRows.map((row) => (
                    <div key={row.label} className="rounded-lg bg-surface-muted/60 p-3">
                      <dt className="text-[11px] uppercase tracking-wide text-text-muted">{row.label}</dt>
                      <dd className="mt-1 text-base font-semibold text-text-main">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {renderKeyValueSection('Additional Details', listing.details, [
              'beds',
              'baths',
              'sqft',
              'lotSize',
              'yearBuilt',
              'hoaFees',
              'basement',
              'propertyType',
              'status',
              'description',
            ])}

            {renderKeyValueSection('Listing Meta', listing.meta, ['mlsName', 'daysOnMarket'])}

            {listing.address?.lat != null && listing.address?.lng != null && (
              <section className="rounded-2xl border border-border bg-white/80 p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-text-main">Map</h2>
                <div className="mt-4 h-72 overflow-hidden rounded-xl border border-border">
                  <InlineMap
                    listings={[mapListing as any]}
                    selectedListingId={listing.id}
                    hoveredListingId={null}
                  />
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-dashed border-border bg-surface-muted/60 p-4 text-xs text-text-muted">
              <p className="font-semibold text-text-main">
                {attribution}
              </p>
              <p className="mt-1">
                Information deemed reliable but not guaranteed. Buyers should verify all information with the listing broker.
              </p>
            </section>
          </div>

          <div className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-24">
            <ContactAgentPanel
              listingId={listing.id}
              listingAddress={listingAddressFull}
            />
          </div>
        </div>

        <SiteFooter />
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-surface-muted/60 p-3">
      <dt className="text-[11px] uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="mt-1 text-base font-semibold text-text-main">{value}</dd>
    </div>
  );
}
