import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function AdminOverviewPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <article className="rounded-3xl border border-border bg-white/85 p-6 shadow-sm">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
            Admin overview
          </p>
          <h2 className="text-2xl font-semibold text-text-main">
            Brand settings are the only active Epic 14 admin surface
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-text-secondary">
            This route group stays intentionally narrow. Start with the brand
            bootstrap page to inspect the current runtime config and asset override
            state before the editable form lands in the next slice.
          </p>
          <div className="pt-2">
            <Link
              href="/admin/brand"
              className="inline-flex items-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95"
            >
              Open brand settings
            </Link>
          </div>
        </div>
      </article>

      <article className="rounded-3xl border border-border bg-surface-muted/70 p-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">
            Scope boundary
          </p>
          <h2 className="text-xl font-semibold text-text-main">Not a generic dashboard</h2>
          <p className="text-sm leading-6 text-text-secondary">
            No tenant management, user administration, analytics, or content CMS
            panels are introduced here. This slice only establishes the brand-admin
            foundation.
          </p>
        </div>
      </article>
    </div>
  );
}
