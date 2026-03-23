'use client';

import { Listing } from '@project-x/shared-types';
import { useLeadModalStore } from '@/stores/useLeadModalStore';
import {
  formatAddressCityStateZip,
  formatAddressFull,
  formatAttribution,
  formatDescription,
  formatDaysOnMarketShort,
  formatBasement,
  formatHOAFees,
  formatLotSize,
  formatPrice,
  formatSqft,
  formatStatus,
  formatYearBuilt,
  formatPropertyType,
  getStatusBadgeClasses,
  getListingDetailsRows,
  normalizeRemarks,
} from '@/lib/listingFormat';

type DetailItemProps = {
  label: string;
  value: string | number | null | undefined;
};

const DetailItem = ({ label, value }: DetailItemProps) => {
  if (value === null || value === undefined || String(value).trim() === '') {
    return null;
  }
  return (
    <div>
      <span className="text-sm text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <p className="font-semibold text-slate-800 dark:text-slate-200">
        {String(value)}
      </p>
    </div>
  );
};

type ListingInfoProps = {
  listing: Listing;
  variant?: 'card' | 'modal' | 'detail';
};

export function ListingInfo({ listing, variant = 'modal' }: ListingInfoProps) {
  const openLeadModal = useLeadModalStore((s) => s.open);

  const priceText = formatPrice(listing);
  const fullAddress = formatAddressFull(listing);
  const cityStateZip = formatAddressCityStateZip(listing);

  const { beds, baths, sqft, lotSize, yearBuilt, propertyType, status } =
    listing.details ?? {};
  const sqftText = formatSqft(sqft ?? null) ?? '-';
  const statusText = formatStatus(status);
  const statusClass = getStatusBadgeClasses(status);
  const domText = formatDaysOnMarketShort(listing.meta?.daysOnMarket ?? null);
  const detailRows = getListingDetailsRows(listing);
  const lotSizeText = formatLotSize(lotSize ?? null);
  const yearBuiltText = formatYearBuilt(yearBuilt ?? null);
  const propertyTypeText = formatPropertyType(propertyType ?? null);
  const hoaText = formatHOAFees(listing.details?.hoaFees ?? null);
  const basementText = formatBasement(listing.details?.basement ?? null);
  const normalizedDesc = normalizeRemarks(listing.description ?? null);

  return (
    <>
      <div className="p-6 overflow-y-auto flex-grow">
        {statusText && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusClass}`}
          >
            {statusText}
          </span>
        )}
        <h1 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white">
          {priceText}
        </h1>
        {domText && (
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
            {domText}
          </p>
        )}
        <p className="text-md text-slate-600 dark:text-slate-400 mt-1">
          {fullAddress}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-500">
          {cityStateZip}
        </p>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-center border-y border-slate-200 dark:border-slate-700 py-4">
          <div>
            <span className="font-bold text-2xl text-slate-800 dark:text-slate-100">
              {beds ?? '-'}
            </span>
            <p className="text-xs text-slate-500">Beds</p>
          </div>
          <div>
            <span className="font-bold text-2xl text-slate-800 dark:text-slate-100">
              {baths ?? '-'}
            </span>
            <p className="text-xs text-slate-500">Baths</p>
          </div>
          <div>
            <span className="font-bold text-2xl text-slate-800 dark:text-slate-100">
              {sqftText}
            </span>
            <p className="text-xs text-slate-500">Sqft</p>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-200 mb-2">
            Key Facts
          </h2>
          <div className="grid grid-cols-2 gap-y-2 gap-x-4">
            <DetailItem label="Status" value={statusText || undefined} />
            {domText && <DetailItem label="Days on Market" value={domText} />}
            {lotSizeText && <DetailItem label="Lot Size" value={lotSizeText} />}
            {yearBuiltText && <DetailItem label="Year Built" value={yearBuiltText} />}
            {propertyTypeText && <DetailItem label="Property Type" value={propertyTypeText} />}
            {hoaText && <DetailItem label="HOA" value={hoaText} />}
            {basementText && <DetailItem label="Basement" value={basementText} />}
          </div>
        </div>

        {detailRows.length > 0 && (
          <div className="mt-6">
            <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-200 mb-2">
              Agent &amp; Office Information
            </h2>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              {detailRows.map((row) => (
                <DetailItem key={row.label} label={row.label} value={row.value} />
              ))}
            </div>
          </div>
        )}

        {variant === 'detail' && normalizedDesc && (
          <div className="mt-6">
            <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-200 mb-2">
              Description
            </h2>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line">
              {normalizedDesc}
            </p>
          </div>
        )}

        <p className="mt-4 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-pre-line">
          {formatAttribution(listing)}
        </p>
      </div>

      <div className="p-6 border-t border-slate-200 dark:border-slate-700 mt-auto">
        <button
          type="button"
          onClick={() =>
            openLeadModal({
              intent: "schedule-showing",
              entrySource: "listing-info-modal",
              listingId: listing.id,
              listingAddress: listing.address?.full ?? undefined,
            })
          }
          className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300"
        >
          I&apos;m Interested
        </button>
      </div>
    </>
  );
}
