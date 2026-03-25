'use client';

import { useEffect } from 'react';
import Link from 'next/link';

import type { AdminBrandResponse } from '@project-x/shared-types';

import { useAuthStore } from '@/stores/auth-store';
import { useAdminBrandStore } from '@/stores/admin-brand-store';

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1 rounded-2xl border border-border bg-surface px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
        {label}
      </p>
      <p className="break-words text-sm text-text-main">{value}</p>
    </div>
  );
}

function AssetStatus({
  label,
  overrideValue,
  fallbackValue,
}: {
  label: string;
  overrideValue: string | null;
  fallbackValue: string;
}) {
  return (
    <article className="rounded-3xl border border-border bg-white/80 p-5 shadow-sm">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
            {label}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-text-main">
            {overrideValue ? 'Row-level override active' : 'Using config-defined asset'}
          </h3>
        </div>
        <div className="space-y-3 text-sm text-text-secondary">
          <p>
            <span className="font-semibold text-text-main">Override URL:</span>{' '}
            {overrideValue ?? 'None'}
          </p>
          <p>
            <span className="font-semibold text-text-main">Config fallback:</span>{' '}
            {fallbackValue}
          </p>
        </div>
      </div>
    </article>
  );
}

function BootstrapSummary({ brand }: { brand: AdminBrandResponse }) {
  const { config, assets } = brand;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <article className="rounded-3xl border border-border bg-white/85 p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                Current identity
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-text-main">
                {config.brandName}
              </h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {config.brandTagline ?? 'No tagline configured yet.'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow
                label="Primary contact"
                value={config.agentName ?? 'No agent name configured'}
              />
              <DetailRow label="Email" value={config.contact.email} />
              <DetailRow
                label="Phone"
                value={config.contact.phone ?? 'No phone configured'}
              />
              <DetailRow
                label="Address"
                value={config.contact.address ?? 'No address configured'}
              />
            </div>
          </div>
        </article>

        <article className="rounded-3xl border border-border bg-white/85 p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
                Theme snapshot
              </p>
              <h2 className="mt-2 text-xl font-semibold text-text-main">
                Design system baseline
              </h2>
            </div>
            <div className="grid gap-3">
              <DetailRow label="Primary color" value={config.theme.colors.primary} />
              <DetailRow
                label="Surface color"
                value={config.theme.colors.surface}
              />
              <DetailRow
                label="Font family"
                value={config.theme.typography.fontFamily}
              />
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <AssetStatus
          label="Logo"
          overrideValue={assets.logoUrl}
          fallbackValue={config.logo.url}
        />
        <AssetStatus
          label="Favicon"
          overrideValue={assets.faviconUrl}
          fallbackValue={config.favicon ?? 'No favicon configured'}
        />
      </section>

      <section className="rounded-3xl border border-dashed border-border bg-surface-muted/70 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
              Next slice boundary
            </p>
            <h2 className="text-xl font-semibold text-text-main">
              Editable form, preview, and upload execution land next
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-text-secondary">
              This page is intentionally read-only for now. The store already holds
              original and draft brand data in memory, but save flows, direct upload
              UX, and preview scaffolding are intentionally deferred.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-text-main transition hover:border-primary/30"
          >
            Back to Admin Overview
          </Link>
        </div>
      </section>
    </div>
  );
}

export default function BrandBootstrapView() {
  const { user, isInitialized, isLoading: isAuthLoading } = useAuthStore((state) => ({
    user: state.user,
    isInitialized: state.isInitialized,
    isLoading: state.isLoading,
  }));
  const {
    draft,
    isLoading,
    isLoaded,
    error,
    errorCode,
    validationErrors,
    loadCurrentBrand,
    reset,
  } = useAdminBrandStore((state) => ({
    draft: state.draft,
    isLoading: state.isLoading,
    isLoaded: state.isLoaded,
    error: state.error,
    errorCode: state.errorCode,
    validationErrors: state.validationErrors,
    loadCurrentBrand: state.loadCurrentBrand,
    reset: state.reset,
  }));

  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    if (!user) {
      reset();
      return;
    }

    if (user.role !== 'ADMIN') {
      return;
    }

    if (isLoaded || isLoading) {
      return;
    }

    void loadCurrentBrand().catch(() => undefined);
  }, [isInitialized, isLoaded, isLoading, loadCurrentBrand, reset, user]);

  if (!isInitialized || isAuthLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-3xl border border-border bg-white/85 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-text-main">Sign-in required</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Your session is no longer available. Sign in again to access the admin
          brand workspace.
        </p>
      </div>
    );
  }

  if (user.role !== 'ADMIN' || errorCode === 'INSUFFICIENT_ROLE') {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-amber-900">Admin access required</h2>
        <p className="mt-2 text-sm text-amber-800">
          This workspace is limited to tenant admins. The API remains the primary
          enforcement layer, and this UI does not expose any brand data when your
          role is insufficient.
        </p>
      </div>
    );
  }

  if (isLoading || (!isLoaded && !error && !draft)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (errorCode === 'UNAUTHENTICATED') {
    return (
      <div className="rounded-3xl border border-border bg-white/85 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-text-main">Session expired</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Your admin session is no longer valid. Refresh the page or sign in again
          before continuing.
        </p>
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-red-900">
          Could not load brand bootstrap data
        </h2>
        <p className="mt-2 text-sm text-red-800">
          {error ?? 'An unexpected error blocked the initial admin brand read.'}
        </p>
        {validationErrors.length > 0 ? (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-red-800">
            {validationErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return <BootstrapSummary brand={draft} />;
}
