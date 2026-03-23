"use client";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6 py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-main">Page not found</h1>
        <p className="mt-2 text-text-main/70">The page you&apos;re looking for does not exist.</p>
        <a href="/search" className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-primary-foreground">
          Back to search
        </a>
      </div>
    </div>
  );
}
