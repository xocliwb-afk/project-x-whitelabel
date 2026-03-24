'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoritesStore } from '@/stores/useFavoritesStore';

type FavoriteButtonProps = {
  listingId: string;
  className?: string;
};

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s-6.716-4.19-9.193-8.045C.726 9.692 2.042 5.5 6.142 5.5c2.254 0 3.694 1.326 4.469 2.595C11.386 6.826 12.826 5.5 15.08 5.5c4.1 0 5.416 4.192 3.336 7.455C18.716 16.81 12 21 12 21Z" />
    </svg>
  );
}

export default function FavoriteButton({ listingId, className = '' }: FavoriteButtonProps) {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { user, isInitialized } = useAuthStore((state) => ({
    user: state.user,
    isInitialized: state.isInitialized,
  }));
  const isFavorited = useFavoritesStore((state) => state.ids.has(listingId));
  const pendingState = useFavoritesStore((state) => state.pendingById[listingId]);
  const toggle = useFavoritesStore((state) => state.toggle);

  const isPending = Boolean(pendingState);
  const ariaLabel = isFavorited ? 'Remove saved home' : 'Save home';

  return (
    <div className={`relative ${className}`.trim()}>
      <button
        type="button"
        aria-pressed={isFavorited}
        aria-label={ariaLabel}
        disabled={!isInitialized || isPending}
        onClick={async (event) => {
          event.preventDefault();
          event.stopPropagation();
          setErrorMessage(null);

          if (!user) {
            router.push('/login');
            return;
          }

          try {
            await toggle(listingId);
          } catch (error) {
            setErrorMessage(
              error instanceof Error ? error.message : 'Failed to update favorites.',
            );
          }
        }}
        className={`inline-flex items-center justify-center rounded-full border border-white/80 bg-white/90 p-2 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 ${
          isFavorited ? 'text-rose-600' : 'text-slate-700'
        }`}
      >
        <HeartIcon filled={isFavorited} />
      </button>
      {errorMessage ? (
        <p className="absolute right-0 top-full mt-2 w-48 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-lg">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
