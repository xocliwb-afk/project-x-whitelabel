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

router.post("/geocode", async (req, res) => {
  const rawQuery = typeof req.body?.query === "string" ? req.body.query : "";
  const query = rawQuery.trim();
  const normalized = normalizeQuery(query);

  if (!normalized) {
    return res.status(400).json({ ok: false, code: "BAD_REQUEST", error: "Query is required" });
  }

  const token = process.env.MAPBOX_GEOCODE_TOKEN;
  if (!token) {
    return res
      .status(503)
      .json({ ok: false, code: "PROVIDER_NOT_CONFIGURED", error: "Mapbox geocoding is not configured" });
  }

  const rpmLimit = Number(process.env.GEO_RATE_LIMIT_RPM) || 60;
  const ip = getIp(req);
  const rate = takeToken(`geo:geocode:${ip}`, rpmLimit);
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(rate.retryAfterSeconds));
    return res.status(429).json({ ok: false, code: "RATE_LIMITED", error: "Too many requests" });
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
      return res.status(502).json({
        ok: false,
        code: `UPSTREAM_HTTP_${upstream.status}`,
        error: `Mapbox ${upstream.status}: ${snippet}`,
      });
    }
    const data = await upstream.json();
    feature = Array.isArray(data?.features) ? data.features[0] : null;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return res
        .status(502)
        .json({ ok: false, code: "UPSTREAM_TIMEOUT", error: "Mapbox request timed out" });
    }
    return res
      .status(502)
      .json({ ok: false, code: "UPSTREAM_FETCH_ERROR", error: "Mapbox fetch failed" });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!feature) {
    return res.status(404).json({ ok: false, code: "NOT_FOUND", error: "No results found" });
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
    return res
      .status(502)
      .json({ ok: false, code: "INVALID_RESULT", error: "Mapbox returned an invalid result" });
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
