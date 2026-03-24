import { z } from 'zod';

import type { BrandConfig } from './brand';

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid 6-digit hex color');

const assetReference = z.string().min(1).max(2000);

export const brandConfigSchema = z
  .object({
    brandName: z.string().min(1).max(200),
    brandTagline: z.string().max(500).optional(),
    agentName: z.string().max(200).optional(),
    contact: z.object({
      email: z.string().email(),
      phone: z.string().max(50).optional(),
      address: z.string().max(500).optional(),
    }),
    logo: z.object({
      url: assetReference,
      darkUrl: assetReference.optional(),
      height: z.number().int().positive(),
      alt: z.string().min(1).max(200),
    }),
    favicon: assetReference.optional(),
    theme: z.object({
      colors: z
        .object({
          primary: hexColor,
          primaryForeground: hexColor,
          primaryAccent: hexColor,
          background: hexColor,
          surface: hexColor,
          surfaceMuted: hexColor,
          surfaceAccent: hexColor,
          textMain: hexColor,
          textSecondary: hexColor,
          textMuted: hexColor,
          border: hexColor,
          danger: hexColor,
          success: hexColor,
        })
        .strict(),
      typography: z.object({
        fontFamily: z.string().min(1).max(500),
        baseSizePx: z.number().positive(),
        headingWeight: z.number().int().positive(),
        bodyWeight: z.number().int().positive(),
      }),
      radius: z.object({
        card: z.number().nonnegative(),
        button: z.number().nonnegative(),
        input: z.number().nonnegative(),
      }),
    }),
    navItems: z
      .array(
        z.object({
          label: z.string().min(1).max(200),
          href: z.string().min(1).max(2000),
        }),
      )
      .optional(),
    neighborhoods: z
      .array(
        z.object({
          label: z.string().min(1).max(200),
          slug: z.string().min(1).max(200),
        }),
      )
      .optional(),
    search: z
      .object({
        defaultCenter: z
          .object({
            lat: z.number(),
            lng: z.number(),
          })
          .optional(),
        defaultZoom: z.number().optional(),
        defaultBbox: z.string().optional(),
        defaultStatus: z.array(z.string().min(1)).optional(),
      })
      .optional(),
    compliance: z
      .object({
        mlsDisclaimer: z.string().optional(),
        brokerLicense: z.string().optional(),
        brokerageName: z.string().optional(),
        brokerageUrl: z.string().url().optional(),
        brokerageEmail: z.string().email().optional(),
        equalHousingLogo: z.boolean().optional(),
      })
      .optional(),
    features: z
      .object({
        tourEngine: z.boolean().optional(),
        aiSearch: z.boolean().optional(),
        contactForm: z.boolean().optional(),
        scheduleShowing: z.boolean().optional(),
      })
      .catchall(z.boolean())
      .optional(),
  })
  .passthrough();

export type ValidatedBrandConfig = z.infer<typeof brandConfigSchema>;

export function validateBrandConfig(
  raw: unknown,
): { valid: true; config: ValidatedBrandConfig } | { valid: false; errors: string[] } {
  const result = brandConfigSchema.safeParse(raw);
  if (result.success) {
    return { valid: true, config: result.data };
  }

  return {
    valid: false,
    errors: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
  };
}

export type BrandAssetOverrides = {
  logoUrl: string | null;
  faviconUrl: string | null;
};

function cloneBrandConfig(config: BrandConfig): BrandConfig {
  return JSON.parse(JSON.stringify(config)) as BrandConfig;
}

/**
 * Applies row-level Brand.logoUrl/faviconUrl overrides while preserving the
 * public runtime BrandConfig shape returned to consumers.
 */
export function applyBrandAssetOverrides(
  config: BrandConfig,
  overrides: Partial<BrandAssetOverrides>,
): BrandConfig {
  const cloned = cloneBrandConfig(config);

  if (typeof overrides.logoUrl === 'string' && overrides.logoUrl.trim()) {
    cloned.logo.url = overrides.logoUrl;
  }

  if (typeof overrides.faviconUrl === 'string' && overrides.faviconUrl.trim()) {
    cloned.favicon = overrides.faviconUrl;
  }

  return cloned;
}

type OptionalKeys<T extends object> = {
  [K in keyof T]-?: undefined extends T[K] ? K : never;
}[keyof T];

type RequiredKeys<T extends object> = Exclude<keyof T, OptionalKeys<T>>;

type DeepPartialValue<T> =
  T extends Array<infer U>
    ? U[]
    : T extends object
      ? DeepPartial<T>
      : T;

/**
 * PATCH helper for later Epic 14 slices.
 * - objects deep-merge
 * - arrays replace wholesale
 * - optional fields may be set to null to clear
 * - required fields may be omitted, but may not be set to null
 */
export type DeepPartial<T> = T extends object
  ? { [K in RequiredKeys<T>]?: DeepPartialValue<T[K]> } & {
      [K in OptionalKeys<T>]?: DeepPartialValue<Exclude<T[K], undefined>> | null;
    }
  : T;

export type BrandAssetType = 'logo' | 'favicon';

export interface AdminBrandResponse {
  config: BrandConfig;
  assets: BrandAssetOverrides;
}

export interface PutAdminBrandRequest {
  config: BrandConfig;
  assets: BrandAssetOverrides;
}

/**
 * PATCH semantics for later Epic 14 routes:
 * - `config` deep-merges into the existing config
 * - arrays replace wholesale
 * - optional config fields may be nulled to clear
 * - required config fields may not be nulled or removed
 * - asset override fields may be nulled to clear row-level overrides
 */
export interface PatchAdminBrandRequest {
  config?: DeepPartial<BrandConfig>;
  assets?: Partial<BrandAssetOverrides>;
}

export interface BrandValidateRequest {
  config: BrandConfig;
  assets: BrandAssetOverrides;
}

export interface BrandValidateResponse {
  valid: boolean;
  errors: string[];
}

export interface BrandAssetInitRequest {
  assetType: BrandAssetType;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
}

export interface BrandAssetInitResponse {
  assetType: BrandAssetType;
  uploadUrl: string;
  assetUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresAt: string;
}
