import type { Metadata } from "next";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import Header from "@/components/Header";
import { MapLayoutProvider } from "@/context/MapLayoutContext";
import { BrandProvider } from "@/context/BrandContext";
import LeadModalContainer from "@/components/LeadModalContainer";
import DevAnalyticsPanel from "@/components/DevAnalyticsPanel";
import AuthInitializer from "@/components/auth/auth-initializer";
import { fetchBrand, generateBrandCssVars } from "@/lib/brand";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await fetchBrand();
  return {
    title: {
      default: brand.brandName,
      template: `%s | ${brand.brandName}`,
    },
    description: "White-label real estate search platform",
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const brand = await fetchBrand();
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
}
