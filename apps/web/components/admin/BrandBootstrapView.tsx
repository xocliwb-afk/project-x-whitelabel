'use client';

import { useEffect } from 'react';

import BrandEditorForm from '@/components/admin/BrandEditorForm';
import { useAuthStore } from '@/stores/auth-store';
import { useAdminBrandStore } from '@/stores/admin-brand-store';

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
      reset();
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
          Could not load brand editor data
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

  return <BrandEditorForm />;
}
