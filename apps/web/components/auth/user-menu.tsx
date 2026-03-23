'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export default function UserMenu() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  if (!user) return null;

  const displayLabel = user.displayName || user.email;

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.push('/');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-sm font-medium text-slate-800 transition hover:bg-white"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
          {(user.displayName || user.email)[0].toUpperCase()}
        </span>
        <span className="hidden max-w-[120px] truncate sm:inline">{displayLabel}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-48 rounded-xl border border-slate-200 bg-white py-1 text-slate-800 shadow-lg">
          <div className="border-b border-slate-100 px-4 py-2">
            <p className="truncate text-sm font-medium">{displayLabel}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
