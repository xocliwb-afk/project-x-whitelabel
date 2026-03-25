import Link from 'next/link';
import type { AuthUser } from '@project-x/shared-types';

type AdminShellProps = {
  user?: AuthUser | null;
  children: React.ReactNode;
};

function AdminNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-full border border-border bg-white/80 px-4 py-2 text-sm font-semibold text-text-main transition hover:border-primary/30 hover:bg-surface-muted"
    >
      {children}
    </Link>
  );
}

export default function AdminShell({ user, children }: AdminShellProps) {
  const displayName = user?.displayName || user?.email || 'Admin user';

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-border bg-white/85 shadow-sm">
          <div className="flex flex-col gap-6 px-6 py-8 sm:px-8">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-text-muted">
                Epic 14 Admin
              </p>
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-text-main">
                    Brand workspace
                  </h1>
                  <p className="max-w-3xl text-sm leading-6 text-text-secondary">
                    A bounded admin surface for tenant brand configuration only. This
                    route group is intentionally narrow and will grow into the editor
                    in later Epic 14 slices.
                  </p>
                </div>
                {user ? (
                  <div className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
                    <p className="font-semibold text-text-main">{displayName}</p>
                    <p>{user.role}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <AdminNavLink href="/admin">Overview</AdminNavLink>
              <AdminNavLink href="/admin/brand">Brand Settings</AdminNavLink>
            </div>
          </div>
        </section>

        <section>{children}</section>
      </div>
    </div>
  );
}
