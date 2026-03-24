'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { SavedSearchFilters } from '@project-x/shared-types';
import AuthGuard from '@/components/auth/auth-guard';
import { buildSearchParamsFromSavedFilters } from '@/lib/saved-search-filters';
import { useAuthStore } from '@/stores/auth-store';
import { useSavedSearchesStore } from '@/stores/useSavedSearchesStore';

function formatSavedSearchSummary(filters: SavedSearchFilters): string {
  const parts: string[] = [];

  if (filters.q) parts.push(filters.q);
  if (filters.cities?.length) parts.push(`Cities: ${filters.cities.join(', ')}`);
  if (filters.neighborhoods?.length) {
    parts.push(`Neighborhoods: ${filters.neighborhoods.join(', ')}`);
  }
  if (filters.minPrice != null || filters.maxPrice != null) {
    parts.push(
      `Price: ${filters.minPrice ?? 0} - ${filters.maxPrice ?? 'Any'}`,
    );
  }
  if (filters.beds != null) parts.push(`${filters.beds}+ beds`);
  if (filters.baths != null) parts.push(`${filters.baths}+ baths`);
  if (filters.propertyType) parts.push(filters.propertyType);
  if (filters.status?.length) parts.push(`Status: ${filters.status.join(', ')}`);

  return parts.slice(0, 3).join(' • ') || 'Custom search filters';
}

function SavedSearchesPageContent() {
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const { items, isLoading, error, hydrate, remove } = useSavedSearchesStore((state) => ({
    items: state.items,
    isLoading: state.isLoading,
    error: state.error,
    hydrate: state.hydrate,
    remove: state.remove,
  }));

  useEffect(() => {
    if (!authUser) {
      return;
    }

    void hydrate().catch(() => undefined);
  }, [authUser, hydrate]);

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-text-main">Saved Searches</h1>
          <p className="text-sm text-text-muted">
            Reuse your favorite filter combinations without rebuilding them from scratch.
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isLoading && items.length === 0 ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-border bg-white/80 p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-text-main">No saved searches yet</h2>
            <p className="mt-2 text-sm text-text-muted">
              Apply a few filters on the search page, then save them for later.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-3xl border border-border bg-white/80 p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-text-main">{item.name}</h2>
                      {item.notifyNew ? (
                        <span className="rounded-full bg-primary-accent px-3 py-1 text-xs font-semibold text-text-main">
                          Notify New
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-text-muted">
                      {formatSavedSearchSummary(item.filters)}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-text-muted">
                      Updated {new Date(item.updatedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      aria-label={`Apply saved search: ${item.name}`}
                      onClick={() => {
                        const params = buildSearchParamsFromSavedFilters(item.filters);
                        const queryString = params.toString();
                        router.push(queryString ? `/search?${queryString}` : '/search');
                      }}
                      className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete saved search: ${item.name}`}
                      onClick={() => void remove(item.id)}
                      className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-text-main"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SavedSearchesPage() {
  return (
    <AuthGuard>
      <SavedSearchesPageContent />
    </AuthGuard>
  );
}
