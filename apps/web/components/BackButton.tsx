'use client';

import { useRouter } from 'next/navigation';

type BackButtonProps = {
  className?: string;
};

export default function BackButton({ className }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={`inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-sm font-medium text-white transition hover:bg-slate-900 ${className ?? ''}`}
      aria-label="Go back to previous page"
    >
      <span aria-hidden="true">←</span>
      Back
    </button>
  );
}
