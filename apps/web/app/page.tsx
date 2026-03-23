import Link from "next/link";

export default function OverviewPage() {
  return (
    <div className="h-full w-full overflow-y-auto bg-surface">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Project X - Monorepo Structure
        </h1>
        <p className="mt-4 text-base leading-relaxed text-text-muted">
          This is the migrated Next.js 14 application. It currently uses mock data and the 
          standardized theme system.
        </p>
        <div className="mt-8">
          <Link 
            href="/search" 
            className="inline-flex items-center justify-center rounded-button bg-primary-accent px-5 py-3 text-base font-medium text-white hover:bg-opacity-90 transition-colors"
          >
            View Search Prototype
          </Link>
        </div>
      </div>
    </div>
  );
}