'use client';

export default function ListingCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-lg bg-white shadow-md dark:bg-slate-800">
      <div className="relative h-48 w-full bg-slate-200 dark:bg-slate-700" />
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-6 w-24 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="h-8 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="space-y-2 border-t border-slate-200 pt-4 text-xs dark:border-slate-700">
          <div className="flex items-center gap-3">
            <span className="h-4 w-12 rounded bg-slate-200 dark:bg-slate-700" />
            <span className="h-4 w-12 rounded bg-slate-200 dark:bg-slate-700" />
            <span className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700" />
          </div>
          <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    </div>
  );
}
