import { Router } from "express";
import fetch from "node-fetch";
import { takeToken } from "../services/rateLimiter.service";

const router = Router();

type GeocodeResult = {
  bbox: string;
  center: { lat: number; lng: number };
  displayName: string;
  type?: string;
};

type CacheEntry = { result: GeocodeResult; expiresAt: number };

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000;

const normalizeQuery = (query: string) => query.trim().toLowerCase().replace(/\s+/g, " ");

const getIp = (req: any) => {
  const xf = req.headers?.["x-forwarded-for"];
  if (typeof xf === "string") {
    return xf.split(",")[0].trim();
  }
  if (Array.isArray(xf) && xf.length > 0) {
    return xf[0];
  }
  return req.ip || req.connection?.remoteAddress || "unknown";
};

const toBboxString = (bboxArr: number[]) =>
  bboxArr.map((n) => Number(n).toFixed(6)).join(",");

const sendGeoError = (
  res: any,
  status: number,
  message: string,
  code: "VALIDATION_ERROR" | "RATE_LIMITED" | "GEO_LOOKUP_FAILED" | "GEO_NOT_FOUND",
) =>
  res.status(status).json({
    error: true,
    message,
    code,
    status,
  });

router.post("/geocode", async (req, res) => {
  const rawQuery = typeof req.body?.query === "string" ? req.body.query : "";
  const query = rawQuery.trim();
  const normalized = normalizeQuery(query);

  if (!normalized) {
    return sendGeoError(res, 400, "Query is required", "VALIDATION_ERROR");
  }

  const token = process.env.MAPBOX_GEOCODE_TOKEN;
  if (!token) {
    return sendGeoError(res, 503, "Mapbox geocoding is not configured", "GEO_LOOKUP_FAILED");
  }

  const rpmLimit = Number(process.env.GEO_RATE_LIMIT_RPM) || 60;
  const ip = getIp(req);
  const rate = takeToken(`geo:geocode:${ip}`, rpmLimit);
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(rate.retryAfterSeconds));
    return sendGeoError(res, 429, "Too many requests", "RATE_LIMITED");
  }

  const cached = cache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json({ ok: true, result: cached.result });
  }
  cache.delete(normalized);

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
  );
  url.searchParams.set("limit", "1");
  url.searchParams.set("types", "place,postcode,address,region");
  url.searchParams.set("country", "us");
  url.searchParams.set("access_token", token);

  const timeoutMs = Number(process.env.GEO_TIMEOUT_MS) || 8000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let feature: any;
  try {
    const upstream = await fetch(url.toString(), { method: "GET", signal: controller.signal });
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      const snippet = text.replace(/\s+/g, " ").trim().slice(0, 200);
      const detail = snippet ? `Mapbox ${upstream.status}: ${snippet}` : `Mapbox ${upstream.status}`;
      return sendGeoError(res, 502, detail, "GEO_LOOKUP_FAILED");
    }
    const data = await upstream.json();
    feature = Array.isArray(data?.features) ? data.features[0] : null;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return sendGeoError(res, 502, "Mapbox request timed out", "GEO_LOOKUP_FAILED");
    }
    return sendGeoError(res, 502, "Mapbox fetch failed", "GEO_LOOKUP_FAILED");
  } finally {
    clearTimeout(timeoutId);
  }

  if (!feature) {
    return sendGeoError(res, 404, "No results found", "GEO_NOT_FOUND");
  }

  const rawBbox = Array.isArray(feature.bbox) ? feature.bbox : null;
  const centerArr = Array.isArray(feature.center) ? feature.center : [];
  let centerLng = Number(centerArr[0]);
  let centerLat = Number(centerArr[1]);

  let bboxArray: number[] | null =
    rawBbox && rawBbox.length === 4 && rawBbox.every((v: any) => Number.isFinite(Number(v)))
      ? rawBbox.map((v: any) => Number(v))
      : null;

  if (!bboxArray && Number.isFinite(centerLat) && Number.isFinite(centerLng)) {
    const delta = 0.02;
    bboxArray = [centerLng - delta, centerLat - delta, centerLng + delta, centerLat + delta];
  }

  if ((!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) && bboxArray) {
    centerLng = (bboxArray[0] + bboxArray[2]) / 2;
    centerLat = (bboxArray[1] + bboxArray[3]) / 2;
  }

  if (!bboxArray || !Number.isFinite(centerLat) || !Number.isFinite(centerLng)) {
    return sendGeoError(res, 502, "Mapbox returned an invalid result", "GEO_LOOKUP_FAILED");
  }

  const result: GeocodeResult = {
    bbox: toBboxString(bboxArray),
    center: { lat: centerLat, lng: centerLng },
    displayName: typeof feature.place_name === "string" ? feature.place_name : query,
    type: Array.isArray(feature.place_type) ? feature.place_type[0] : undefined,
  };

  cache.set(normalized, { result, expiresAt: Date.now() + CACHE_TTL_MS });

  return res.json({ ok: true, result });
});

export default router;
