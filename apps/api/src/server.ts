import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import crypto from "crypto";
import listingsRouter from "./routes/listings.route";
import leadsRouter from "./routes/leads.route";
import toursRouter from "./routes/tours.route";
import aiRouter from "./routes/ai.route";
import geoRouter from "./routes/geo.route";
import { getListingProvider } from "./utils/provider.factory";
import { CaptchaService } from "./services/captcha.service";

dotenv.config();

const app = express();
const resolvePort = () => {
  const argv = process.argv.slice(2);
  const flagIndex = argv.findIndex((a) => a === "--port" || a === "-p");
  if (flagIndex !== -1 && argv[flagIndex + 1]) {
    const fromArg = Number(argv[flagIndex + 1]);
    if (Number.isFinite(fromArg)) return fromArg;
  }
  const eqArg = argv.find((a) => a.startsWith("--port="));
  if (eqArg) {
    const fromEq = Number(eqArg.split("=")[1]);
    if (Number.isFinite(fromEq)) return fromEq;
  }

  const envPort = Number(process.env.PORT);
  if (Number.isFinite(envPort) && envPort > 0) return envPort;

  const npmConfigPort = Number(process.env.npm_config_port);
  if (Number.isFinite(npmConfigPort) && npmConfigPort > 0) return npmConfigPort;

  return 3002;
};

const PORT = resolvePort();

const parseAllowedOrigins = () => {
  const raw = process.env.ALLOWED_ORIGINS;
  if (raw) {
    return raw
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
  }
  // default: allow localhost/127.* for dev
  return undefined;
};

const allowedOrigins = parseAllowedOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // non-browser or curl

      if (!allowedOrigins) {
        // dev/default: allow localhost/127.*
        if (
          origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:")
        ) {
          return callback(null, true);
        }
        return callback(null, false);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());
app.use(express.json());

app.use((req, res, next) => {
  const incomingId = typeof req.headers["x-request-id"] === "string" ? req.headers["x-request-id"] : undefined;
  const requestId = incomingId || crypto.randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
});

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader(
    "Permissions-Policy",
    "accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
  );
  next();
});

app.use("/api/listings", listingsRouter);
app.use("/api/listing", listingsRouter);
app.use("/api", leadsRouter);
app.use("/api/tours", toursRouter);
app.use("/api/v1/tours", toursRouter);
app.use("/api/ai", aiRouter);
app.use("/api/geo", geoRouter);

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    status: "ok",
    service: "api",
    uptimeSec: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

type ReadyCacheEntry = { data: any; expiresAt: number };
let readyCache: ReadyCacheEntry | null = null;

app.get("/ready", (req, res) => {
  const now = Date.now();
  if (readyCache && readyCache.expiresAt > now) {
    return res.status(readyCache.data.ok ? 200 : 503).json(readyCache.data);
  }

  const timestamp = new Date().toISOString();
  const checks = {
    env: { ok: true, missing: [] as string[] },
    listingsProvider: { ok: true, provider: process.env.DATA_PROVIDER || "unknown" as string, reason: undefined as string | undefined },
    captcha: { ok: true, mode: "enabled" as "enabled" | "disabled" | "invalid_in_production" },
  };

  if (!process.env.DATA_PROVIDER) {
    checks.env.ok = false;
    checks.env.missing.push("DATA_PROVIDER");
  }

  try {
    getListingProvider();
  } catch (err: any) {
    checks.listingsProvider.ok = false;
    checks.listingsProvider.reason = "config_error";
  }

  try {
    const captcha = new CaptchaService();
    if (process.env.CAPTCHA_DISABLED === "true") {
      checks.captcha.mode = "disabled";
    } else {
      checks.captcha.mode = "enabled";
    }
  } catch (err: any) {
    checks.captcha.ok = false;
    checks.captcha.mode = "invalid_in_production";
  }

  const ready = checks.env.ok && checks.listingsProvider.ok && checks.captcha.ok;
  const response = {
    ok: ready,
    status: ready ? "ready" : "not_ready",
    checks,
    timestamp,
  };

  readyCache = { data: response, expiresAt: now + 10 * 1000 };

  res.status(ready ? 200 : 503).json(response);
});

app.listen(PORT, () => {
  console.log(`[API] Server running on http://localhost:${PORT}`);
  console.log(
    `[API] Routes exposed: GET /health, GET /api/listings, GET /api/listings/:id, GET /api/listing/:id (alias), POST /api/leads, POST /api/v1/leads`
  );
  if (allowedOrigins) {
    console.log(`[API] CORS: ALLOWED_ORIGINS set (${allowedOrigins.length} origins)`);
  } else {
    console.log("[API] CORS: default localhost/127.* origins allowed");
  }
});
