import { z } from "zod";

const statusEnum = z.enum(["for_sale", "pending", "sold"]);
const propertyTypeEnum = z.enum(["house", "condo", "townhome", "land", "multi_family"]);
const statusAllowlist = new Set(statusEnum.options);
const propertyAllowlist = new Set(propertyTypeEnum.options);
const allowedFilterKeys = new Set([
  "status",
  "propertyType",
  "minPrice",
  "maxPrice",
  "bedsMin",
  "bathsMin",
  "city",
  "zip",
  "keywords",
]);

export const proposedFiltersSchema = z
  .object({
    status: statusEnum.nullable(),
    propertyType: propertyTypeEnum.nullable(),
    minPrice: z.number().nullable(),
    maxPrice: z.number().nullable(),
    bedsMin: z.number().nullable(),
    bathsMin: z.number().nullable(),
    city: z.string().trim().nullable(),
    zip: z.string().trim().regex(/^\d{5}$/).nullable(),
    keywords: z.array(z.string().trim()).min(1).nullable(),
  })
  .strict();

export const parseSearchRequestSchema = z
  .object({
    prompt: z.string().min(1),
    context: z
      .object({
        currentFilters: z.record(z.string(), z.unknown()).optional(),
        searchText: z.string().nullable().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const aiResponseBodySchema = z
  .object({
    proposedFilters: proposedFiltersSchema,
    explanations: z
      .array(
        z
          .object({
            field: z.string().trim(),
            reason: z.string().trim(),
          })
          .strict()
      )
      .default([]),
    confidence: z.number().min(0).max(1),
    warnings: z.array(z.string().trim()).default([]),
    ignoredInputReasons: z.array(z.string().trim()).default([]),
  })
  .strict();

export const aiResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    proposedFilters: {
      type: "object",
      additionalProperties: false,
      properties: {
        status: { type: ["string", "null"], enum: ["for_sale", "pending", "sold", null] },
        propertyType: {
          type: ["string", "null"],
          enum: ["house", "condo", "townhome", "land", "multi_family", null],
        },
        minPrice: { type: ["number", "null"] },
        maxPrice: { type: ["number", "null"] },
        bedsMin: { type: ["number", "null"] },
        bathsMin: { type: ["number", "null"] },
        city: { type: ["string", "null"] },
        zip: { type: ["string", "null"], pattern: "^\\d{5}$" },
        keywords: {
          type: ["array", "null"],
          items: { type: "string" },
          minItems: 1,
        },
      },
      required: [
        "status",
        "propertyType",
        "minPrice",
        "maxPrice",
        "bedsMin",
        "bathsMin",
        "city",
        "zip",
        "keywords",
      ],
    },
    explanations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          field: { type: "string" },
          reason: { type: "string" },
        },
        required: ["field", "reason"],
      },
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    warnings: { type: "array", items: { type: "string" } },
    ignoredInputReasons: { type: "array", items: { type: "string" } },
  },
  required: ["proposedFilters", "explanations", "confidence", "warnings", "ignoredInputReasons"],
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const dedupe = (arr: string[]) => Array.from(new Set(arr.filter((v) => typeof v === "string" && v.trim())));

export const sanitizeModelOutput = (
  raw: any,
  ignoredInputReasons: string[] = []
): z.infer<typeof aiResponseBodySchema> => {
  const pf = raw?.proposedFilters ?? {};
  const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const strOrNull = (v: unknown) => (typeof v === "string" ? v.trim() : null);
  const minPrice = numOrNull(pf?.minPrice);
  const maxPrice = numOrNull(pf?.maxPrice);
  let normalizedMinPrice = minPrice;
  let normalizedMaxPrice = maxPrice;
  if (normalizedMinPrice !== null && normalizedMaxPrice !== null && normalizedMinPrice > normalizedMaxPrice) {
    normalizedMinPrice = maxPrice;
    normalizedMaxPrice = minPrice;
  }

  const zip = typeof pf?.zip === "string" && /^\d{5}$/.test(pf.zip.trim()) ? pf.zip.trim() : null;

  const confidence =
    typeof raw?.confidence === "number" && Number.isFinite(raw.confidence)
      ? clamp(raw.confidence, 0, 1)
      : 0;

  const ignoredModel = Array.isArray(raw?.ignoredInputReasons)
    ? raw.ignoredInputReasons.filter((w: any) => typeof w === "string")
    : [];

  return {
    proposedFilters: {
      status: typeof pf?.status === "string" && statusAllowlist.has(pf.status) ? pf.status : null,
      propertyType:
        typeof pf?.propertyType === "string" && propertyAllowlist.has(pf.propertyType) ? pf.propertyType : null,
      minPrice: normalizedMinPrice,
      maxPrice: normalizedMaxPrice,
      bedsMin: numOrNull(pf?.bedsMin),
      bathsMin: numOrNull(pf?.bathsMin),
      city: strOrNull(pf?.city),
      zip,
      keywords: Array.isArray(pf?.keywords)
        ? pf.keywords.filter((k: any) => typeof k === "string" && k.trim().length > 0).map((k: string) => k.trim())
        : null,
    },
    explanations: Array.isArray(raw?.explanations)
      ? raw.explanations.filter((e: any) => e && typeof e.field === "string" && typeof e.reason === "string")
      : [],
    confidence,
    warnings: Array.isArray(raw?.warnings)
      ? raw.warnings.filter((w: any) => typeof w === "string")
      : [],
    ignoredInputReasons: [...ignoredModel, ...ignoredInputReasons].filter((w) => typeof w === "string"),
  };
};

const clampRange = (
  value: number | null,
  min: number,
  max: number,
  field: string,
  reasons: string[]
) => {
  if (value === null) return null;
  if (!Number.isFinite(value) || value < min || value > max) {
    reasons.push(`${field}_out_of_range`);
    return null;
  }
  return value;
};

export const enforceAllowedOutput = (
  validated: z.infer<typeof aiResponseBodySchema>
): z.infer<typeof aiResponseBodySchema> => {
  for (const key of Object.keys(validated.proposedFilters)) {
    if (!allowedFilterKeys.has(key)) {
      throw new Error(`Unexpected filter key: ${key}`);
    }
  }

  const reasons: string[] = [];
  const warnings: string[] = Array.isArray(validated.warnings) ? [...validated.warnings] : [];

  const pf = validated.proposedFilters;

  const status =
    typeof pf.status === "string" && statusAllowlist.has(pf.status) ? pf.status : null;
  const propertyType =
    typeof pf.propertyType === "string" && propertyAllowlist.has(pf.propertyType) ? pf.propertyType : null;

  const minPrice = clampRange(pf.minPrice, 0, 50_000_000, "minPrice", reasons);
  const maxPrice = clampRange(pf.maxPrice, 0, 50_000_000, "maxPrice", reasons);
  let normalizedMinPrice = minPrice;
  let normalizedMaxPrice = maxPrice;
  if (
    normalizedMinPrice !== null &&
    normalizedMaxPrice !== null &&
    normalizedMinPrice > normalizedMaxPrice
  ) {
    normalizedMinPrice = maxPrice;
    normalizedMaxPrice = minPrice;
  }

  const bedsMin = clampRange(pf.bedsMin, 0, 20, "bedsMin", reasons);
  const bathsMin = clampRange(pf.bathsMin, 0, 20, "bathsMin", reasons);
  const zip = typeof pf.zip === "string" && /^\d{5}$/.test(pf.zip.trim()) ? pf.zip.trim() : null;

  let keywords: string[] | null = null;
  if (Array.isArray(pf.keywords)) {
    keywords = [];
    for (const k of pf.keywords) {
      if (typeof k !== "string") continue;
      const trimmed = k.trim();
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (lower.includes("http://") || lower.includes("https://") || lower.includes("www.") || lower.includes("://")) {
        reasons.push("keyword_url_removed");
        continue;
      }
      keywords.push(trimmed);
    }
    if (keywords.length === 0) keywords = null;
  }

  const actionStrings = [
    ...(validated.warnings || []),
    ...(validated.explanations || []).map((e) => e.reason),
    ...(validated.ignoredInputReasons || []),
  ]
    .filter((v) => typeof v === "string")
    .map((v) => v.toLowerCase());
  const actionPatterns = ["auto-apply", "run search", "fetch", "call", "open url", "execute", "javascript", "curl"];
  const hasActionInstruction = actionStrings.some((str) => actionPatterns.some((p) => str.includes(p)));
  if (hasActionInstruction && !warnings.includes("action_instructions_ignored")) {
    warnings.push("action_instructions_ignored");
  }

  const modelIgnored = Array.isArray(validated.ignoredInputReasons)
    ? validated.ignoredInputReasons.filter((w) => typeof w === "string")
    : [];

  return {
    ...validated,
    proposedFilters: {
      status,
      propertyType,
      minPrice: normalizedMinPrice,
      maxPrice: normalizedMaxPrice,
      bedsMin,
      bathsMin,
      city: typeof pf.city === "string" ? pf.city : null,
      zip,
      keywords,
    },
    confidence: clamp(validated.confidence ?? 0, 0, 1),
    warnings: dedupe(warnings),
    ignoredInputReasons: dedupe([...modelIgnored, ...reasons]),
  };
};
