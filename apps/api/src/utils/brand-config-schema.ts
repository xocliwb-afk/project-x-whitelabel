import { z } from 'zod';

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
