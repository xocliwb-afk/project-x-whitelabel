import { redirect } from 'next/navigation';

import AdminShell from '@/components/admin/AdminShell';
import { getServerAdminState } from '@/lib/admin-session';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminState = await getServerAdminState();

  if (adminState.status === 'unauthenticated') {
    redirect('/login');
  }

  if (adminState.status === 'forbidden') {
    return (
      <AdminShell user={adminState.user}>
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-amber-900">Access denied</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-800">
            You are signed in, but this admin surface is limited to tenant admins.
            The API is still the primary security boundary, so no brand-admin data
            is exposed here without the required role.
          </p>
        </div>
      </AdminShell>
    );
  }

  return <AdminShell user={adminState.user}>{children}</AdminShell>;
}
