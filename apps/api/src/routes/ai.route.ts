import crypto from "crypto";
import { Router } from "express";
import { ApiError } from "@project-x/shared-types";
import {
  aiResponseBodySchema,
  aiResponseJsonSchema,
  parseSearchRequestSchema,
  enforceAllowedOutput,
  sanitizeModelOutput,
} from "../services/aiParseSearch.schema";
import { callGemini } from "../services/gemini.service";
import { checkDailyLimit, cleanupDaily, takeToken } from "../services/rateLimiter.service";

const router = Router();

const getConfig = () => {
  return {
    enabled: process.env.AI_ENABLED === "true",
    maxPromptChars: Number(process.env.AI_MAX_PROMPT_CHARS) || 2000,
    rateLimitRpm: Number(process.env.AI_RATE_LIMIT_RPM) || 30,
    maxReqPerIpPerDay: Number(process.env.AI_MAX_REQ_PER_IP_PER_DAY) || 50,
    maxConcurrency: Number(process.env.AI_MAX_CONCURRENCY) || 2,
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 10000,
    retryMaxAttempts: Number(process.env.AI_RETRY_MAX_ATTEMPTS) || 2,
    model: process.env.GEMINI_MODEL || "gemini-1.5-pro",
    apiKey: process.env.GEMINI_API_KEY || "",
    ipHashSalt: process.env.AI_LOG_IP_HASH_SALT || "ai-ip-salt",
    logLevel: process.env.AI_LOG_LEVEL || "info",
  };
};

let inFlight = 0;

const hashIp = (ip: string, salt: string) =>
  crypto.createHash("sha256").update(`${salt}${ip}`).digest("hex").slice(0, 12);

const SYSTEM_PROMPT =
  "You are an assistant that returns ONLY valid JSON matching the provided schema. Do not include markdown or additional keys. Do not provide instructions or actions.";

const getIp = (req: any) => {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string") {
    return xf.split(",")[0].trim();
  }
  if (Array.isArray(xf)) {
    return xf[0];
  }
  return req.ip || req.connection?.remoteAddress || "unknown";
};

router.post("/parse-search", async (req, res) => {
  const cfg = getConfig();
  const requestId = res.locals.requestId ?? crypto.randomUUID();
  res.setHeader("x-request-id", requestId);
  const started = Date.now();
  const ip = getIp(req);
  const ipHash = hashIp(ip, cfg.ipHashSalt);
  let incremented = false;
  const logOutcome = (outcome: string, meta: Record<string, unknown> = {}) => {
    if (cfg.logLevel === "silent") return;
    console.log(
      JSON.stringify({
        event: "ai.parse_search",
        requestId,
        ipHash,
        model: cfg.model,
        promptChars: typeof req.body?.prompt === "string" ? req.body.prompt.length : 0,
        latencyMs: Date.now() - started,
        outcome,
        inFlight,
        ...meta,
      })
    );
  };

  try {
    // periodic cleanup (1% of requests)
    if (Math.random() < 0.01) {
      cleanupDaily();
    }

    if (!cfg.enabled) {
      const error: ApiError = {
        error: true,
        message: "AI assistant is disabled",
        code: "AI_DISABLED",
        status: 503,
      };
      logOutcome("disabled");
      return res.status(503).json(error);
    }

    if (!cfg.apiKey) {
      const error: ApiError = {
        error: true,
        message: "AI assistant is not configured",
        code: "AI_DISABLED",
        status: 503,
      };
      logOutcome("disabled_missing_key");
      return res.status(503).json(error);
    }

    const daily = checkDailyLimit(ipHash, cfg.maxReqPerIpPerDay);
    if (!daily.allowed) {
      const error: ApiError = {
        error: true,
        message: "Daily AI request limit reached",
        code: "RATE_LIMITED_DAILY",
        status: 429,
      };
      res.setHeader("Retry-After", String(daily.retryAfterSeconds));
      logOutcome("daily_limited", { retryAfter: daily.retryAfterSeconds });
      return res.status(429).json(error);
    }

    const rpm = takeToken(`ai:parse-search:${ipHash}`, cfg.rateLimitRpm);
    if (!rpm.allowed) {
      const error: ApiError = {
        error: true,
        message: "Too many requests",
        code: "RATE_LIMITED",
        status: 429,
      };
      res.setHeader("Retry-After", String(rpm.retryAfterSeconds));
      logOutcome("rpm_limited", { retryAfter: rpm.retryAfterSeconds });
      return res.status(429).json(error);
    }

    if (inFlight >= cfg.maxConcurrency) {
      const error: ApiError = {
        error: true,
        message: "AI is busy, please retry shortly",
        code: "AI_BUSY",
        status: 503,
      };
      logOutcome("busy", { inFlight });
      return res.status(503).json(error);
    }

    inFlight += 1;
    incremented = true;

    const parsedReq = parseSearchRequestSchema.safeParse(req.body);
    if (!parsedReq.success) {
      const error: ApiError = {
        error: true,
        message: "Invalid request",
        code: "BAD_REQUEST",
        status: 400,
      };
      logOutcome("bad_request", { issues: parsedReq.error?.issues?.length });
      return res.status(400).json(error);
    }

    const { prompt, context } = parsedReq.data;
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || trimmedPrompt.length > cfg.maxPromptChars) {
      const error: ApiError = {
        error: true,
        message: "Prompt too long",
        code: "BAD_REQUEST",
        status: 400,
      };
      logOutcome("bad_request", { reason: "prompt_length" });
      return res.status(400).json(error);
    }

    const ignoredInputReasons: string[] = [];
    let contextString: string | undefined;
    if (context) {
      const serialized = JSON.stringify(context);
      if (serialized.length > 4000) {
        ignoredInputReasons.push("context_too_large_ignored");
      } else {
        contextString = serialized;
      }
    }

    const modelPrompt = contextString
      ? `${SYSTEM_PROMPT}\n\nUser request:\n${trimmedPrompt}\n\nContext:\n${contextString}`
      : `${SYSTEM_PROMPT}\n\nUser request:\n${trimmedPrompt}`;

    const gemini = await callGemini({
      prompt: modelPrompt,
      apiKey: cfg.apiKey,
      model: cfg.model,
      schema: aiResponseJsonSchema,
      timeoutMs: cfg.timeoutMs,
      retryMaxAttempts: cfg.retryMaxAttempts,
    });

    if (gemini.status === 429) {
      const error: ApiError = {
        error: true,
        message: "AI upstream rate limited",
        code: "AI_UPSTREAM_ERROR",
        status: 502,
      };
      logOutcome("upstream_rate_limited", { geminiStatus: gemini.status, attempts: gemini.attempts });
      return res.status(502).json(error);
    }

    if (gemini.status === 408) {
      const error: ApiError = {
        error: true,
        message: "AI request timed out",
        code: "AI_TIMEOUT",
        status: 504,
      };
      logOutcome("timeout", { attempts: gemini.attempts });
      return res.status(504).json(error);
    }

    if (gemini.status >= 500 || gemini.status === 0) {
      const error: ApiError = {
        error: true,
        message: "AI upstream error",
        code: "AI_UPSTREAM_ERROR",
        status: 502,
      };
      logOutcome("upstream_error", { geminiStatus: gemini.status, attempts: gemini.attempts });
      return res.status(502).json(error);
    }

    let parsedModel: any;
    try {
      const outer = JSON.parse(gemini.bodyText);
      const innerText = outer?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof innerText !== "string") {
        throw new Error("Missing model text");
      }
      parsedModel = JSON.parse(innerText);
    } catch (err: any) {
      const error: ApiError = {
        error: true,
        message: "AI response parse error",
        code: "AI_BAD_MODEL_OUTPUT",
        status: 502,
      };
      logOutcome("bad_model_output", { reason: "json_parse" });
      return res.status(502).json(error);
    }

    const sanitized = sanitizeModelOutput(parsedModel, ignoredInputReasons);
    const validated = aiResponseBodySchema.safeParse(sanitized);
    if (!validated.success) {
      const error: ApiError = {
        error: true,
        message: "AI response failed validation",
        code: "AI_BAD_MODEL_OUTPUT",
        status: 502,
      };
      logOutcome("bad_model_output", { reason: "schema" });
      return res.status(502).json(error);
    }

    let guarded;
    try {
      guarded = enforceAllowedOutput(validated.data);
    } catch (err: any) {
      const error: ApiError = {
        error: true,
        message: "AI response failed validation",
        code: "AI_BAD_MODEL_OUTPUT",
        status: 502,
      };
      logOutcome("bad_model_output", { reason: "guard_reject" });
      return res.status(502).json(error);
    }

    const responseBody = {
      requestId,
      ...guarded,
    };

    logOutcome("ok", { attempts: gemini.attempts, geminiStatus: gemini.status });
    return res.status(200).json(responseBody);
  } catch (err: any) {
    const error: ApiError = {
      error: true,
      message: err?.message ?? "AI request failed",
      code: "AI_UPSTREAM_ERROR",
      status: 502,
    };
    console.error(
      JSON.stringify({
        event: "ai.parse_search_error",
        requestId,
        ipHash,
        message: error.message,
      })
    );
    return res.status(502).json(error);
  } finally {
    if (incremented) {
      inFlight = Math.max(0, inFlight - 1);
    }
  }
});

export default router;
