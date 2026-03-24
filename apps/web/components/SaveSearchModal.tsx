'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { SavedSearchFilters } from '@project-x/shared-types';
import { lockScroll, unlockScroll } from '@/lib/scrollLock';
import { useAuthStore } from '@/stores/auth-store';
import { useSavedSearchesStore } from '@/stores/useSavedSearchesStore';

type SaveSearchModalProps = {
  isOpen: boolean;
  filters: SavedSearchFilters | null;
  onClose: () => void;
};

export default function SaveSearchModal({
  isOpen,
  filters,
  onClose,
}: SaveSearchModalProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const createSavedSearch = useSavedSearchesStore((state) => state.create);
  const [name, setName] = useState('');
  const [notifyNew, setNotifyNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setNotifyNew(false);
      setError(null);
      setSuccess(null);
      return;
    }

    lockScroll();
    return () => unlockScroll();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  if (!isOpen || !filters) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-search-modal-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-1 text-xs font-semibold text-white hover:bg-black/80"
          aria-label="Close save search modal"
        >
          ✕
        </button>

        <div className="space-y-4">
          <div>
            <h2 id="save-search-modal-title" className="text-lg font-semibold text-text-main">
              Save this search
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Save your current filters so you can revisit them quickly.
            </p>
          </div>

          <label className="flex flex-col gap-2 text-sm text-text-main">
            Search name
            <input
              type="text"
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-main outline-none transition focus:border-primary"
              placeholder="Weekend open houses"
            />
          </label>

          <label className="flex items-center gap-3 text-sm text-text-main">
            <input
              type="checkbox"
              checked={notifyNew}
              onChange={(event) => setNotifyNew(event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            Notify me about new matches later
          </label>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </p>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-text-main"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={async () => {
                setError(null);
                setSuccess(null);

                if (!user) {
                  onClose();
                  router.push('/login');
                  return;
                }

                const normalizedName = name.normalize('NFC').trim();
                if (!normalizedName) {
                  setError('Enter a name for this saved search.');
                  return;
                }

                setIsSubmitting(true);

                try {
                  const result = await createSavedSearch({
                    name: normalizedName,
                    filters,
                    notifyNew,
                  });
                  setSuccess(result.created ? 'Search saved.' : 'This search is already saved.');
                  closeTimerRef.current = setTimeout(() => {
                    onClose();
                  }, 900);
                } catch (submitError) {
                  setError(
                    submitError instanceof Error
                      ? submitError.message
                      : 'Failed to save search.',
                  );
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Saving...' : 'Save Search'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
