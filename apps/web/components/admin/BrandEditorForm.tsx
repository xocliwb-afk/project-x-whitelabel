'use client';

import { useRef } from 'react';
import type { BrandAssetType } from '@project-x/shared-types';

import { useAdminBrandStore } from '@/stores/admin-brand-store';

function isValidHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function fieldErrors(errors: string[], path: string): string[] {
  return errors.filter((message) => message.startsWith(`${path}:`));
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
        {eyebrow}
      </p>
      <div className="space-y-1">
        <h3 className="text-xl font-semibold text-text-main">{title}</h3>
        <p className="text-sm leading-6 text-text-secondary">{description}</p>
      </div>
    </div>
  );
}

function ErrorList({ errors }: { errors: string[] }) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-1 text-sm text-red-700">
      {errors.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  errors = [],
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email';
  disabled?: boolean;
  errors?: string[];
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-text-main">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-main outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
      />
      <ErrorList errors={errors} />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  errors = [],
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  errors?: string[];
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-text-main">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={disabled}
        className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-main outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
      />
      <ErrorList errors={errors} />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
  disabled = false,
  errors = [],
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  errors?: string[];
}) {
  const safeColor = isValidHexColor(value) ? value : '#000000';

  return (
    <div className="space-y-2">
      <span className="text-sm font-semibold text-text-main">{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={safeColor}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          disabled={disabled}
          className="h-12 w-14 rounded-xl border border-border bg-white p-1"
          aria-label={label}
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="w-full rounded-2xl border border-border bg-white px-4 py-3 font-mono text-sm uppercase text-text-main outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
        />
      </div>
      <ErrorList errors={errors} />
    </div>
  );
}

function AssetControl({
  assetType,
  label,
  overrideUrl,
  fallbackUrl,
  accept,
  hint,
  disabled,
}: {
  assetType: BrandAssetType;
  label: string;
  overrideUrl: string | null;
  fallbackUrl: string;
  accept: string;
  hint: string;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const validationErrors = useAdminBrandStore((state) => state.validationErrors);
  const uploadStatus = useAdminBrandStore((state) => state.uploadStatus[assetType]);
  const uploadAsset = useAdminBrandStore((state) => state.uploadAsset);
  const setAssetOverride = useAdminBrandStore((state) => state.setAssetOverride);

  const errors = fieldErrors(validationErrors, `assets.${assetType}Url`);

  return (
    <article className="rounded-3xl border border-border bg-white/85 p-6 shadow-sm">
      <div className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-muted">
              {label}
            </p>
            <h3 className="text-xl font-semibold text-text-main">
              {overrideUrl ? 'Override ready' : 'Using config asset'}
            </h3>
            <p className="text-sm leading-6 text-text-secondary">
              {hint}
            </p>
          </div>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
            {uploadStatus.isUploading ? 'Uploading' : overrideUrl ? 'Override active' : 'Fallback'}
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            Config fallback URL
          </p>
          <p className="break-all rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-main">
            {fallbackUrl}
          </p>
        </div>

        <TextField
          label={`${label} override URL`}
          value={overrideUrl ?? ''}
          onChange={(value) => setAssetOverride(assetType, value.trim().length > 0 ? value : null)}
          placeholder="https://..."
          disabled={disabled}
          errors={errors}
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="inline-flex items-center rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-text-main transition hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploadStatus.isUploading ? `Uploading ${label.toLowerCase()}...` : `Upload ${label}`}
          </button>
          <button
            type="button"
            onClick={() => setAssetOverride(assetType, null)}
            disabled={disabled || !overrideUrl}
            className="inline-flex items-center rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-main transition hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Clear override
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) {
              return;
            }

            void uploadAsset(assetType, file).catch(() => undefined);
          }}
        />

        {uploadStatus.success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {uploadStatus.success}
          </div>
        ) : null}

        {uploadStatus.error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {uploadStatus.error}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function LiveSummary() {
  const draft = useAdminBrandStore((state) => state.draft);

  if (!draft) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-border bg-white/85 p-6 shadow-sm">
      <div className="space-y-4">
        <SectionHeader
          eyebrow="Draft summary"
          title="Live brand snapshot"
          description="A bounded summary of the current in-memory draft. Full preview work remains out of scope for this slice."
        />
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div
            className="rounded-[28px] border px-6 py-6 text-white shadow-sm"
            style={{
              backgroundColor: draft.config.theme.colors.primary,
              fontFamily: draft.config.theme.typography.fontFamily,
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/75">
              Brand identity
            </p>
            <h3 className="mt-3 text-3xl font-semibold">{draft.config.brandName}</h3>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/85">
              {draft.config.brandTagline ?? 'No tagline configured yet.'}
            </p>
          </div>
          <div
            className="rounded-[28px] border p-6 shadow-sm"
            style={{
              backgroundColor: draft.config.theme.colors.surface,
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
              Effective assets
            </p>
            <div className="mt-4 space-y-3 text-sm text-text-main">
              <p>
                <span className="font-semibold">Logo:</span>{' '}
                {draft.assets.logoUrl ?? draft.config.logo.url}
              </p>
              <p>
                <span className="font-semibold">Favicon:</span>{' '}
                {draft.assets.faviconUrl ?? draft.config.favicon ?? 'Not configured'}
              </p>
              <p>
                <span className="font-semibold">Font:</span>{' '}
                {draft.config.theme.typography.fontFamily}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function BrandEditorForm() {
  const {
    draft,
    isDirty,
    validationErrors,
    submitError,
    saveSuccessMessage,
    validateSuccessMessage,
    isSaving,
    isValidating,
    uploadStatus,
    updateDraft,
    resetDraft,
    validateDraft,
    saveDraft,
  } = useAdminBrandStore((state) => ({
    draft: state.draft,
    isDirty: state.isDirty,
    validationErrors: state.validationErrors,
    submitError: state.submitError,
    saveSuccessMessage: state.saveSuccessMessage,
    validateSuccessMessage: state.validateSuccessMessage,
    isSaving: state.isSaving,
    isValidating: state.isValidating,
    uploadStatus: state.uploadStatus,
    updateDraft: state.updateDraft,
    resetDraft: state.resetDraft,
    validateDraft: state.validateDraft,
    saveDraft: state.saveDraft,
  }));

  if (!draft) {
    return null;
  }

  const isUploading = uploadStatus.logo.isUploading || uploadStatus.favicon.isUploading;
  const isBusy = isSaving || isValidating || isUploading;
  const canSave = isDirty && !isBusy;
  const busyLabel = isSaving
    ? 'Saving in progress'
    : isValidating
      ? 'Validation in progress'
      : isUploading
        ? 'Upload in progress'
        : null;
  const statusMessage = saveSuccessMessage ?? validateSuccessMessage;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-border bg-white/85 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
              Editor status
            </p>
            <h2 className="text-2xl font-semibold text-text-main">
              {isDirty ? 'Unsaved brand changes' : 'Brand draft is in sync'}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-text-secondary">
              Edit a bounded set of identity, contact, theme, and asset override
              fields. Validation runs against the existing admin API contract before
              save, and uploads stay metadata-first with direct browser PUTs.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void validateDraft().catch(() => undefined)}
              disabled={isBusy}
              className="inline-flex items-center rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-text-main transition hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isValidating ? 'Validating...' : 'Validate draft'}
            </button>
            <button
              type="button"
              onClick={resetDraft}
              disabled={isBusy || !isDirty}
              className="inline-flex items-center rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-main transition hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reset to saved
            </button>
            <button
              type="button"
              onClick={() => void saveDraft().catch(() => undefined)}
              disabled={!canSave}
              className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
              isDirty
                ? 'bg-amber-100 text-amber-900'
                : 'bg-emerald-100 text-emerald-900'
            }`}
          >
            {isDirty ? 'Dirty draft' : 'Up to date'}
          </span>
          {busyLabel ? (
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-900">
              {busyLabel}
            </span>
          ) : null}
        </div>

        {statusMessage ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {statusMessage}
          </div>
        ) : null}

        {submitError ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {submitError}
          </div>
        ) : null}

        {validationErrors.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
            <p className="text-sm font-semibold text-red-900">
              Review the validation issues below before saving.
            </p>
            <div className="mt-3">
              <ErrorList errors={validationErrors} />
            </div>
          </div>
        ) : null}
      </section>

      <LiveSummary />

      <section className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <article className="rounded-3xl border border-border bg-white/85 p-6 shadow-sm">
            <div className="space-y-5">
              <SectionHeader
                eyebrow="Identity basics"
                title="Brand identity"
                description="Edit the brand-facing identity fields that will land first in the Epic 14 editor."
              />
              <div className="grid gap-4">
                <TextField
                  label="Brand name"
                  value={draft.config.brandName}
                  onChange={(value) =>
                    updateDraft((current) => {
                      current.config.brandName = value;
                    })
                  }
                  disabled={isBusy}
                  errors={fieldErrors(validationErrors, 'brandName')}
                />
                <TextAreaField
                  label="Brand tagline"
                  value={draft.config.brandTagline ?? ''}
                  onChange={(value) =>
                    updateDraft((current) => {
                      current.config.brandTagline = value.trim().length > 0 ? value : undefined;
                    })
                  }
                  disabled={isBusy}
                  errors={fieldErrors(validationErrors, 'brandTagline')}
                />
                <TextField
                  label="Agent name"
                  value={draft.config.agentName ?? ''}
                  onChange={(value) =>
                    updateDraft((current) => {
                      current.config.agentName = value.trim().length > 0 ? value : undefined;
                    })
                  }
                  disabled={isBusy}
                  errors={fieldErrors(validationErrors, 'agentName')}
                />
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-border bg-white/85 p-6 shadow-sm">
            <div className="space-y-5">
              <SectionHeader
                eyebrow="Contact basics"
                title="Primary contact"
                description="These are the contact fields available in this bounded slice. Save uses PATCH against the existing admin brand API."
              />
              <div className="grid gap-4">
                <TextField
                  label="Email"
                  type="email"
                  value={draft.config.contact.email}
                  onChange={(value) =>
                    updateDraft((current) => {
                      current.config.contact.email = value;
                    })
                  }
                  disabled={isBusy}
                  errors={fieldErrors(validationErrors, 'contact.email')}
                />
                <TextField
                  label="Phone"
                  value={draft.config.contact.phone ?? ''}
                  onChange={(value) =>
                    updateDraft((current) => {
                      current.config.contact.phone = value.trim().length > 0 ? value : undefined;
                    })
                  }
                  disabled={isBusy}
                  errors={fieldErrors(validationErrors, 'contact.phone')}
                />
                <TextAreaField
                  label="Address"
                  value={draft.config.contact.address ?? ''}
                  onChange={(value) =>
                    updateDraft((current) => {
                      current.config.contact.address = value.trim().length > 0 ? value : undefined;
                    })
                  }
                  disabled={isBusy}
                  errors={fieldErrors(validationErrors, 'contact.address')}
                />
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-border bg-white/85 p-6 shadow-sm">
            <div className="space-y-5">
              <SectionHeader
                eyebrow="Theme basics"
                title="Brand theme"
                description="This slice keeps theme editing intentionally narrow: two color tokens and the primary font family."
              />
              <div className="grid gap-4">
                <ColorField
                  label="Primary color"
                  value={draft.config.theme.colors.primary}
                  onChange={(value) =>
                    updateDraft((current) => {
                      current.config.theme.colors.primary = value;
                    })
                  }
                  disabled={isBusy}
                  errors={fieldErrors(validationErrors, 'theme.colors.primary')}
                />
                <ColorField
                  label="Surface color"
                  value={draft.config.theme.colors.surface}
                  onChange={(value) =>
                    updateDraft((current) => {
                      current.config.theme.colors.surface = value;
                    })
                  }
                  disabled={isBusy}
                  errors={fieldErrors(validationErrors, 'theme.colors.surface')}
                />
                <TextField
                  label="Font family"
                  value={draft.config.theme.typography.fontFamily}
                  onChange={(value) =>
                    updateDraft((current) => {
                      current.config.theme.typography.fontFamily = value;
                    })
                  }
                  disabled={isBusy}
                  errors={fieldErrors(validationErrors, 'theme.typography.fontFamily')}
                />
              </div>
            </div>
          </article>
        </div>

        <div className="space-y-8">
          <AssetControl
            assetType="logo"
            label="Logo"
            overrideUrl={draft.assets.logoUrl}
            fallbackUrl={draft.config.logo.url}
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            hint="Upload a PNG, JPEG, or WEBP up to 2 MiB, or paste a direct override URL."
            disabled={isBusy}
          />

          <AssetControl
            assetType="favicon"
            label="Favicon"
            overrideUrl={draft.assets.faviconUrl}
            fallbackUrl={draft.config.favicon ?? 'No favicon configured'}
            accept=".png,.ico,image/png,image/x-icon,image/vnd.microsoft.icon"
            hint="Upload a PNG or ICO up to 512 KiB. SVG remains intentionally unsupported."
            disabled={isBusy}
          />
        </div>
      </section>
    </div>
  );
}
