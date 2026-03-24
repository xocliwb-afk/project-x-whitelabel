"use client";

/**
 * Brand context — provides the tenant-specific BrandConfig to client components.
 * The BrandProvider is rendered in the root layout (server component) with data
 * fetched from the API. Client components access it via the useBrand() hook.
 */

import { createContext, useContext, type ReactNode } from "react";
import type { BrandConfig } from "@project-x/shared-types";

const BrandContext = createContext<BrandConfig | undefined>(undefined);

export function BrandProvider({
  value,
  children,
}: {
  value: BrandConfig;
  children: ReactNode;
}) {
  return (
    <BrandContext.Provider value={value}>{children}</BrandContext.Provider>
  );
}

export function useBrand(): BrandConfig {
  const ctx = useContext(BrandContext);
  if (!ctx) {
    throw new Error("useBrand must be used within BrandProvider");
  }
  return ctx;
}
