import type { BrandConfig } from "@project-x/shared-types";
import { prisma } from "@project-x/database";
import brandJson from "../../../config/brand.json";

/**
 * Returns the current brand configuration from the static brand.json file.
 * @deprecated Use fetchBrand() for runtime tenant-aware brand config.
 */
export function getBrand(): BrandConfig {
  return brandJson as BrandConfig;
}

/** @deprecated Use fetchBrand() + useBrand() instead. */
const brand: BrandConfig = getBrand();
export default brand;

/**
 * Fetch brand config from the API over HTTP.
 * Not used in SSR; kept for client-side and future non-SSR callers.
 * Uses NEXT_PUBLIC_TENANT_ID as x-tenant-id header if set.
 * Falls back to static brand.json only in local development.
 */
export async function fetchBrand(): Promise<BrandConfig> {
  const apiBase =
    process.env.API_PROXY_TARGET ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:3002";

  const url = `${apiBase.replace(/\/+$/, "")}/api/brand`;
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID?.trim();

  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (tenantId) {
      headers["x-tenant-id"] = tenantId;
    }

    const res = await fetch(url, {
      headers,
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      const error = new Error(
        `[brand] Failed to fetch brand config: ${res.status} ${res.statusText}`,
      );
      console.error(error.message);
      if (process.env.NODE_ENV === "development") {
        return getBrand();
      }
      throw error;
    }

    return (await res.json()) as BrandConfig;
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[brand] Error fetching brand config, using static fallback:", err);
      return getBrand();
    }
    throw err;
  }
}

function mergeBrandConfig(
  brand: { config: unknown; logoUrl: string | null; faviconUrl: string | null },
): BrandConfig {
  const config = JSON.parse(JSON.stringify(brand.config)) as BrandConfig;

  if (brand.logoUrl && config.logo) {
    config.logo.url = brand.logoUrl;
  }

  if (brand.faviconUrl) {
    config.favicon = brand.faviconUrl;
  }

  return config;
}

export async function fetchBrandDirect(tenantId = process.env.NEXT_PUBLIC_TENANT_ID?.trim()): Promise<BrandConfig> {
  if (!tenantId) {
    if (process.env.NODE_ENV === "development") {
      return getBrand();
    }

    throw new Error("[brand] Missing NEXT_PUBLIC_TENANT_ID for direct brand lookup");
  }

  try {
    const brand = await prisma.brand.findUnique({
      where: { tenantId },
      select: {
        config: true,
        logoUrl: true,
        faviconUrl: true,
        active: true,
      },
    });

    if (!brand || !brand.active) {
      throw new Error("[brand] No active brand configuration found for tenant");
    }

    return mergeBrandConfig(brand);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[brand] Error loading brand directly, using static fallback:", error);
      return getBrand();
    }

    throw error;
  }
}

/** Convert a hex color like "#14243B" to space-separated RGB channels "20 36 59" */
export function hexToRgbChannels(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

/** Generate a CSS string of :root custom properties from a BrandConfig */
export function generateBrandCssVars(config: BrandConfig): string {
  const { colors, typography, radius } = config.theme;
  const vars: string[] = [
    `--brand-primary: ${hexToRgbChannels(colors.primary)}`,
    `--brand-primary-foreground: ${hexToRgbChannels(colors.primaryForeground)}`,
    `--brand-primary-accent: ${hexToRgbChannels(colors.primaryAccent)}`,
    `--brand-background: ${hexToRgbChannels(colors.background)}`,
    `--brand-surface: ${hexToRgbChannels(colors.surface)}`,
    `--brand-surface-muted: ${hexToRgbChannels(colors.surfaceMuted)}`,
    `--brand-surface-accent: ${hexToRgbChannels(colors.surfaceAccent)}`,
    `--brand-text-main: ${hexToRgbChannels(colors.textMain)}`,
    `--brand-text-secondary: ${hexToRgbChannels(colors.textSecondary)}`,
    `--brand-text-muted: ${hexToRgbChannels(colors.textMuted)}`,
    `--brand-border: ${hexToRgbChannels(colors.border)}`,
    `--brand-danger: ${hexToRgbChannels(colors.danger)}`,
    `--brand-success: ${hexToRgbChannels(colors.success)}`,
    `--brand-font-family: ${typography.fontFamily}`,
    `--brand-radius-card: ${radius.card}px`,
    `--brand-radius-button: ${radius.button}px`,
    `--brand-radius-input: ${radius.input}px`,
  ];
  return `:root { ${vars.join("; ")} }`;
}
