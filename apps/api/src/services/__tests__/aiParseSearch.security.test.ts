import { describe, expect, it } from "vitest";
import {
  aiResponseBodySchema,
  enforceAllowedOutput,
  sanitizeModelOutput,
} from "../aiParseSearch.schema";

const baseModel = {
  proposedFilters: {
    status: "for_sale",
    propertyType: "house",
    minPrice: 100000,
    maxPrice: 400000,
    bedsMin: 3,
    bathsMin: 2,
    city: "Grand Rapids",
    zip: "49503",
    keywords: ["garage"],
  },
  explanations: [],
  confidence: 0.9,
  warnings: [],
  ignoredInputReasons: [],
};

const runPipeline = (raw: any) => {
  const sanitized = sanitizeModelOutput(raw);
  const validated = aiResponseBodySchema.parse(sanitized);
  return enforceAllowedOutput(validated);
};

describe("aiParseSearch safety rails", () => {
  it("accepts valid model output", () => {
    const out = runPipeline(baseModel);
    expect(out.proposedFilters.status).toBe("for_sale");
    expect(out.proposedFilters.maxPrice).toBe(400000);
  });

  it("rejects unknown filter keys", () => {
    const validated = aiResponseBodySchema.parse(sanitizeModelOutput(baseModel));
    const bad = {
      ...validated,
      proposedFilters: { ...(validated.proposedFilters as any), runSearch: true },
    } as any;
    expect(() => enforceAllowedOutput(bad)).toThrow();
  });

  it("removes url-like keywords and notes reason", () => {
    const raw = {
      ...baseModel,
      proposedFilters: { ...baseModel.proposedFilters, keywords: ["porch", "http://evil.com"] },
    };
    const out = runPipeline(raw);
    expect(out.proposedFilters.keywords).toEqual(["porch"]);
    expect(out.ignoredInputReasons).toContain("keyword_url_removed");
  });

  it("drops out-of-range numeric values", () => {
    const raw = {
      ...baseModel,
      proposedFilters: { ...baseModel.proposedFilters, bedsMin: 99, maxPrice: 9_999_999_999 },
    };
    const out = runPipeline(raw);
    expect(out.proposedFilters.bedsMin).toBeNull();
    expect(out.proposedFilters.maxPrice).toBeNull();
    expect(out.ignoredInputReasons).toContain("bedsMin_out_of_range");
    expect(out.ignoredInputReasons).toContain("maxPrice_out_of_range");
  });

  it("swaps inverted prices", () => {
    const raw = {
      ...baseModel,
      proposedFilters: { ...baseModel.proposedFilters, minPrice: 500000, maxPrice: 100000 },
    };
    const out = runPipeline(raw);
    expect(out.proposedFilters.minPrice).toBe(100000);
    expect(out.proposedFilters.maxPrice).toBe(500000);
  });

  it("adds warning when action instructions detected", () => {
    const raw = {
      ...baseModel,
      warnings: ["please auto-apply these filters"],
    };
    const out = runPipeline(raw);
    expect(out.warnings).toContain("action_instructions_ignored");
  });
});
