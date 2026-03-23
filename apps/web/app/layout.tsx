import type { Metadata } from "next";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";
import Header from "@/components/Header";
import { ThemeProvider } from "@/context/ThemeContext";
import LeadModalContainer from "@/components/LeadModalContainer";
import DevAnalyticsPanel from "@/components/DevAnalyticsPanel";

export const metadata: Metadata = {
  title: {
    default: "Brandon Wilcox Home Group",
    template: "%s | Brandon Wilcox Home Group",
  },
  description: "White-label real estate search platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col overflow-x-hidden bg-surface text-text-main antialiased font-sans transition-colors duration-300">
        <ThemeProvider>
          <Header />
          <LeadModalContainer />
          <main className="relative flex-1 overflow-x-hidden">{children}</main>
          {process.env.NODE_ENV === "development" ||
          process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "1" ? (
            <DevAnalyticsPanel />
          ) : null}
        </ThemeProvider>
      </body>
    </html>
  );
}
