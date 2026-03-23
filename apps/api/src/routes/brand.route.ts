import { Router } from "express";
import brandConfig from "../../../../config/brand.json";

const router = Router();

/**
 * GET /api/brand
 * Returns the brand config for runtime consumers (mobile, SSR, etc.).
 * brand.json contains no secrets — it is safe to serve publicly.
 */
router.get("/", (_req, res) => {
  res.json(brandConfig);
});

export default router;
