import crypto from "crypto";
import { Router, Request, Response } from "express";
import { LeadService } from "../services/lead.service";
import { checkDailyLimit, takeToken } from "../services/rateLimiter.service";
import type { LeadRequest } from "../types/lead";

const router = Router();
const leadService = new LeadService();

const getRateLimitConfig = () => {
  const enabledEnv = process.env.LEADS_RATE_LIMIT_ENABLED;
  const isProd = process.env.NODE_ENV === "production";
  return {
    enabled: enabledEnv ? enabledEnv === "true" : isProd,
    rpm: Number(process.env.LEADS_RATE_LIMIT_RPM) || 10,
    maxPerDay: Number(process.env.LEADS_MAX_REQ_PER_IP_PER_DAY) || 25,
    ipHashSalt: process.env.LEADS_LOG_IP_HASH_SALT || "leads-ip-salt",
  };
};

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

const hashIp = (ip: string, salt: string) =>
  crypto.createHash("sha256").update(`${salt}${ip}`).digest("hex").slice(0, 12);

const createLeadHandler = async (req: Request, res: Response) => {
  const payload = req.body as LeadRequest;
  const cfg = getRateLimitConfig();
  const ip = getIp(req);
  const ipHash = hashIp(ip, cfg.ipHashSalt);

  const logRateLimit = (type: "daily" | "rpm", retryAfterSeconds: number) => {
    console.log(
      JSON.stringify({
        event: "leads.rate_limited",
        type,
        ipHash,
        retryAfterSeconds,
        path: req.path,
      }),
    );
  };

  if (cfg.enabled) {
    const daily = checkDailyLimit(`leads:daily:${ipHash}`, cfg.maxPerDay);
    if (!daily.allowed) {
      res.setHeader("Retry-After", String(daily.retryAfterSeconds));
      logRateLimit("daily", daily.retryAfterSeconds);
      return res.status(429).json({
        error: true,
        message: "Daily lead limit reached",
        code: "RATE_LIMITED_DAILY",
        status: 429,
      });
    }

    const rpm = takeToken(`leads:submit:${ipHash}`, cfg.rpm);
    if (!rpm.allowed) {
      res.setHeader("Retry-After", String(rpm.retryAfterSeconds));
      logRateLimit("rpm", rpm.retryAfterSeconds);
      return res.status(429).json({
        error: true,
        message: "Too many requests",
        code: "RATE_LIMITED",
        status: 429,
      });
    }
  }

  try {
    const result = await leadService.submitLead(payload);

    if (result.success) {
      return res.status(201).json({ success: true });
    }

    const status = result.status ?? 400;
    return res.status(status).json({
      success: false,
      message: result.message ?? "Failed to submit lead",
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err?.message ?? "Failed to submit lead",
    });
  }
};

router.post("/v1/leads", createLeadHandler);
router.post("/leads", createLeadHandler);

export default router;
