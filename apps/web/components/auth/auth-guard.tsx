'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isInitialized } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isInitialized && !isLoading && !user) {
      router.push('/login');
    }
  }, [isInitialized, isLoading, user, router]);

  if (!isInitialized || isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
