import type { Metadata } from "next";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import Header from "@/components/Header";
import { MapLayoutProvider } from "@/context/MapLayoutContext";
import { BrandProvider } from "@/context/BrandContext";
import LeadModalContainer from "@/components/LeadModalContainer";
import DevAnalyticsPanel from "@/components/DevAnalyticsPanel";
import AuthInitializer from "@/components/auth/auth-initializer";
import { fetchBrandDirect, generateBrandCssVars } from "@/lib/brand";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const brand = await fetchBrandDirect();
    return {
      title: {
        default: brand.brandName,
        template: `%s | ${brand.brandName}`,
      },
      description: "White-label real estate search platform",
    };
  } catch (error) {
    console.error("[brand] failed to load metadata", error);
    return {
      title: "Site temporarily unavailable",
      description: "Site temporarily unavailable",
    };
  }
}

function SiteUnavailableShell() {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        <main className="flex min-h-screen items-center justify-center px-6 py-16 text-center">
          <div className="max-w-md space-y-3">
            <h1 className="text-2xl font-semibold">Site temporarily unavailable</h1>
            <p className="text-sm text-slate-600">Please try again shortly.</p>
          </div>
        </main>
      </body>
    </html>
  );
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const brand = await fetchBrandDirect();
    const brandCssVars = generateBrandCssVars(brand);

    return (
      <html lang="en">
        <head>
          <style dangerouslySetInnerHTML={{ __html: brandCssVars }} />
        </head>
        <body className="flex min-h-screen flex-col overflow-x-hidden bg-surface text-text-main antialiased font-sans transition-colors duration-300">
          <BrandProvider value={brand}>
            <MapLayoutProvider>
              <AuthInitializer />
              <Header />
              <LeadModalContainer />
              <main className="relative flex-1 overflow-x-hidden">{children}</main>
              {process.env.NODE_ENV === "development" ||
              process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "1" ? (
                <DevAnalyticsPanel />
              ) : null}
            </MapLayoutProvider>
          </BrandProvider>
        </body>
      </html>
    );
  } catch (error) {
    console.error("[brand] failed to render root layout", error);
    return <SiteUnavailableShell />;
  }
}
