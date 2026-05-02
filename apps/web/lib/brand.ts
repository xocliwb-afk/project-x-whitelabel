import type { BrandConfig } from "@project-x/shared-types";
import brandJson from "../../../config/brand.json";

const DEFAULT_FONT_FAMILY =
  "Montserrat, system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
const DEFAULT_CARD_RADIUS = "16px";
const DEFAULT_BUTTON_RADIUS = "9999px";
const DEFAULT_INPUT_RADIUS = "9999px";
const SERVER_TENANT_ENV_FILES = [
  ".env.local",
  ".env",
  "../api/.env.local",
  "../api/.env",
  "apps/api/.env.local",
  "apps/api/.env",
];

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
  const url = `${resolveServerBrandApiBaseUrl()}/api/brand`;
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

class BrandFetchError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "BrandFetchError";
    this.status = status;
  }
}

function normalizeTenantId(value: string | undefined | null): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function resolveServerBrandApiBaseUrl(): string {
  const apiBase =
    process.env.API_PROXY_TARGET ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:3002";

  return apiBase.replace(/\/+$/, "");
}

function parseEnvValue(rawValue: string): string | undefined {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return undefined;
  }

  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed;

  return normalizeTenantId(unquoted);
}

async function readServerTenantIdFromEnvFiles(): Promise<string | undefined> {
  const { access, readFile } = await import("node:fs/promises");
  const { constants } = await import("node:fs");
  const path = await import("node:path");

  const candidatePaths = Array.from(
    new Set(
      SERVER_TENANT_ENV_FILES.map((filePath) =>
        path.resolve(process.cwd(), filePath),
      ),
    ),
  );

  for (const candidatePath of candidatePaths) {
    try {
      await access(candidatePath, constants.R_OK);
    } catch {
      continue;
    }

    const fileContents = await readFile(candidatePath, "utf8");
    const match = fileContents.match(/^\s*DEFAULT_TENANT_ID\s*=\s*(.+)\s*$/m);
    if (!match) {
      continue;
    }

    const tenantId = parseEnvValue(match[1]);
    if (tenantId) {
      return tenantId;
    }
  }

  return undefined;
}

type DirectBrandTenantResolution =
  | { tenantId: string; source: "explicit" | "public-env" | "server-env" | "api-env-file" }
  | null;

async function resolveDirectBrandTenantId(
  tenantId?: string | null,
): Promise<DirectBrandTenantResolution> {
  const explicitTenantId = normalizeTenantId(tenantId);
  if (explicitTenantId) {
    return { tenantId: explicitTenantId, source: "explicit" };
  }

  const publicTenantId = normalizeTenantId(process.env.NEXT_PUBLIC_TENANT_ID);
  if (publicTenantId) {
    return { tenantId: publicTenantId, source: "public-env" };
  }

  const serverTenantId = normalizeTenantId(process.env.DEFAULT_TENANT_ID);
  if (serverTenantId) {
    return { tenantId: serverTenantId, source: "server-env" };
  }

  // Local monorepo fallback: the API app already owns the default-tenant config,
  // but `next start` does not automatically load `apps/api/.env`.
  const fileTenantId = await readServerTenantIdFromEnvFiles();
  if (fileTenantId) {
    return { tenantId: fileTenantId, source: "api-env-file" };
  }

  return null;
}

async function fetchRuntimeBrandByTenant(tenantId: string): Promise<BrandConfig> {
  const response = await fetch(`${resolveServerBrandApiBaseUrl()}/api/brand`, {
    headers: {
      Accept: "application/json",
      "x-tenant-id": tenantId,
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new BrandFetchError(
      `[brand] Failed to fetch runtime brand config: ${response.status} ${response.statusText}`,
      response.status,
    );
  }

  return (await response.json()) as BrandConfig;
}

export async function fetchBrandDirect(tenantId?: string | null): Promise<BrandConfig> {
  const resolvedTenant = await resolveDirectBrandTenantId(tenantId);

  if (!resolvedTenant) {
    if (process.env.NODE_ENV === "development") {
      return getBrand();
    }

    throw new Error(
      "[brand] Missing configured tenant ID for direct brand lookup",
    );
  }

  try {
    return await fetchRuntimeBrandByTenant(resolvedTenant.tenantId);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[brand] Error loading brand directly, using static fallback:", error);
      return getBrand();
    }

    if (
      resolvedTenant.source === "api-env-file" &&
      (!(error instanceof BrandFetchError) || (error.status != null && error.status >= 500))
    ) {
      console.error(
        "[brand] Error loading runtime brand via local API env fallback, using static fallback:",
        error,
      );
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

function sanitizeCssValue(value: string, fallback: string): string {
  const sanitized = value
    .replace(/<\/style/gi, "")
    .replace(/[<>{};"'\\`]/g, "")
    .trim();

  return sanitized || fallback;
}

function toCssRadius(value: unknown, fallback: string): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}px`;
  }

  if (typeof value === "string") {
    return sanitizeCssValue(value, fallback);
  }

  return fallback;
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
    `--brand-font-family: ${sanitizeCssValue(
      typography.fontFamily,
      DEFAULT_FONT_FAMILY,
    )}`,
    `--brand-radius-card: ${toCssRadius(radius.card, DEFAULT_CARD_RADIUS)}`,
    `--brand-radius-button: ${toCssRadius(
      radius.button,
      DEFAULT_BUTTON_RADIUS,
    )}`,
    `--brand-radius-input: ${toCssRadius(radius.input, DEFAULT_INPUT_RADIUS)}`,
  ];
  return `:root { ${vars.join("; ")} }`;
}
