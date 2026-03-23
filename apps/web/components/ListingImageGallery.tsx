'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { Listing } from '@project-x/shared-types';
import { getThumbnailUrl } from '@/lib/listingFormat';

type ListingImageGalleryProps = {
  photos: string[];
  listing: Listing;
};

export default function ListingImageGallery({ photos, listing }: ListingImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasPhotos = Array.isArray(photos) && photos.length > 0;
  const safeIndex = hasPhotos ? currentIndex % photos.length : 0;
  const currentPhoto = hasPhotos ? photos[safeIndex] : getThumbnailUrl(listing);

  const handlePrev = () => {
    if (!hasPhotos) return;
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleNext = () => {
    if (!hasPhotos) return;
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden rounded-xl border border-border">
        <div className="relative w-full aspect-[16/9] bg-slate-200">
          <Image
            src={currentPhoto}
            alt={`Listing photo ${safeIndex + 1}`}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        </div>

        {hasPhotos && photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-800 shadow hover:bg-white"
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-slate-800 shadow hover:bg-white"
              aria-label="Next photo"
            >
              ›
            </button>
          </>
        )}
      </div>

      {hasPhotos && photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, idx) => {
            const isActive = idx === safeIndex;
            return (
              <button
                key={`${photo}-${idx}`}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-md border ${isActive ? 'border-primary ring-2 ring-primary/50' : 'border-border opacity-80 hover:opacity-100'}`}
                aria-label={`View photo ${idx + 1}`}
              >
                <Image
                  src={photo}
                  alt={`Listing thumbnail ${idx + 1}`}
                  fill
                  sizes="120px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
