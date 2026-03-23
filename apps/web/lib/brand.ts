import type { BrandConfig } from "@project-x/shared-types";
import brandJson from "../../../config/brand.json";

/**
 * Returns the current brand configuration.
 * In V1 this reads from the static brand.json file at build time.
 * Future: could be replaced with API fetch or runtime config.
 */
export function getBrand(): BrandConfig {
  return brandJson as BrandConfig;
}

/** Convenience: the loaded brand config singleton */
const brand: BrandConfig = getBrand();
export default brand;
