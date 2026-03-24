import Link from "next/link";
import { fetchBrand } from "@/lib/brand";

export default async function OverviewPage() {
  try {
    const brand = await fetchBrand();

    return (
      <div className="h-full w-full overflow-y-auto bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
            {brand.brandName}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-text-muted">
            {brand.brandTagline ?? "Find your next home."}
          </p>
          <div className="mt-8">
            <Link
              href="/search"
              className="inline-flex items-center justify-center rounded-button bg-primary-accent px-5 py-3 text-base font-medium text-white hover:bg-opacity-90 transition-colors"
            >
              Search Listings
            </Link>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("[brand] failed to render overview page", error);
    return (
      <div className="min-h-screen bg-white px-6 py-16 text-slate-900">
        <div className="mx-auto max-w-md text-center">
          <h1 className="text-2xl font-semibold">Site temporarily unavailable</h1>
        </div>
      </div>
    );
  }
}
