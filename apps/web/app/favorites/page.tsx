'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FavoriteRecord, Listing } from '@project-x/shared-types';
import FavoriteButton from '@/components/FavoriteButton';
import { ListingCard } from '@/components/ListingCard';
import AuthGuard from '@/components/auth/auth-guard';
import {
  fetchListing,
  getFavorites,
  type AuthenticatedRequestOptions,
} from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/auth-store';
import { useFavoritesStore } from '@/stores/useFavoritesStore';

const PAGE_SIZE = 20;
const HYDRATION_CONCURRENCY = 5;

type FavoriteListItem = {
  favorite: FavoriteRecord;
  listing: Listing | null;
  error: string | null;
};

type FavoritePagination = {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

async function getAuthenticatedRequestOptions(): Promise<AuthenticatedRequestOptions> {
  const authUser = useAuthStore.getState().user;
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!authUser?.tenantId || !session?.access_token) {
    throw new Error('Authentication required');
  }

  return {
    accessToken: session.access_token,
    tenantId: authUser.tenantId,
  };
}

async function hydrateFavoriteListings(
  favorites: FavoriteRecord[],
): Promise<FavoriteListItem[]> {
  const results: FavoriteListItem[] = new Array(favorites.length);
  let index = 0;

  async function worker() {
    while (index < favorites.length) {
      const currentIndex = index;
      index += 1;
      const favorite = favorites[currentIndex];

      try {
        const result = await fetchListing(favorite.listingId);
        results[currentIndex] = {
          favorite,
          listing: result.listing,
          error: null,
        };
      } catch (error) {
        results[currentIndex] = {
          favorite,
          listing: null,
          error: error instanceof Error ? error.message : 'Listing no longer available.',
        };
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(HYDRATION_CONCURRENCY, favorites.length) },
      () => worker(),
    ),
  );

  return results;
}

function FavoritesPageContent() {
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const favoriteIds = useFavoritesStore((state) => state.ids);
  const [items, setItems] = useState<FavoriteListItem[]>([]);
  const [pagination, setPagination] = useState<FavoritePagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    hasMore: false,
  });
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFavorites() {
      if (!authUser) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        await useFavoritesStore.getState().hydrate().catch(() => undefined);
        const auth = await getAuthenticatedRequestOptions();
        const response = await getFavorites(auth, page, PAGE_SIZE);
        const hydrated = await hydrateFavoriteListings(response.favorites);

        if (cancelled) {
          return;
        }

        setItems(hydrated);
        setPagination(response.pagination);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Failed to load favorites.',
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [authUser, page]);

  useEffect(() => {
    setItems((currentItems) =>
      currentItems.filter((item) => favoriteIds.has(item.favorite.listingId)),
    );
  }, [favoriteIds]);

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-text-main">Favorites</h1>
          <p className="text-sm text-text-muted">
            Homes you&apos;ve saved for a closer look.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-border bg-white/80 p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-text-main">No saved homes yet</h2>
            <p className="mt-2 text-sm text-text-muted">
              Tap the heart on any listing card to start building your favorites.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {items.map((item) =>
                item.listing ? (
                  <ListingCard
                    key={item.favorite.id}
                    listing={item.listing}
                    isSelected={false}
                    onMouseEnter={() => undefined}
                    onMouseLeave={() => undefined}
                    onClick={(listing) => router.push(`/listing/${listing.id}`)}
                  />
                ) : (
                  <article
                    key={item.favorite.id}
                    className="flex h-full flex-col justify-between rounded-3xl border border-border bg-white/80 p-6 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-text-main">
                          Listing no longer available
                        </h2>
                        <p className="mt-2 text-sm text-text-muted">
                          {item.error || 'This listing could not be loaded right now.'}
                        </p>
                        <p className="mt-3 text-xs uppercase tracking-wide text-text-muted">
                          Listing ID: {item.favorite.listingId}
                        </p>
                      </div>
                      <FavoriteButton listingId={item.favorite.listingId} />
                    </div>
                  </article>
                ),
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-text-main disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <p className="text-sm text-text-muted">
                Page {pagination.page} of {Math.max(1, Math.ceil(pagination.total / pagination.limit))}
              </p>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={!pagination.hasMore}
                className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-text-main disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FavoritesPage() {
  return (
    <AuthGuard>
      <FavoritesPageContent />
    </AuthGuard>
  );
}
