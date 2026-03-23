'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

export default function AuthInitializer() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return null;
}
