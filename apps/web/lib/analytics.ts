const ANALYTICS_ENABLED =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_ANALYTICS_DEBUG === "1";

const MAX_BUFFER_SIZE = 50;

const REDACT_KEYS = new Set([
  "name",
  "firstname",
  "lastName",
  "lastname",
  "fullname",
  "fullName",
  "email",
  "phone",
  "phoneNumber",
  "phonenumber",
  "message",
  "comment",
  "note",
  "ip",
  "ipaddress",
  "ipAddress",
].map((key) => key.toLowerCase()));

const PII_QUERY_KEYS = [
  "name",
  "firstName",
  "lastName",
  "email",
  "phone",
  "message",
  "interest",
  "preferredArea",
  "preferred_area",
  "token",
  "captcha",
  "captchaToken",
  "g-recaptcha-response",
  "g-recaptcha_response",
];

const buffer: Array<Record<string, unknown>> = [];
let sessionId: string | null = null;

const sanitizeUrl = (raw: string | undefined) => {
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    PII_QUERY_KEYS.forEach((key) => {
      url.searchParams.delete(key);
      url.searchParams.delete(key.toLowerCase());
    });
    return url.toString();
  } catch {
    return undefined;
  }
};

const ensureSessionId = () => {
  if (sessionId) return sessionId;
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    sessionId = crypto.randomUUID();
    return sessionId;
  }
  sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  return sessionId;
};

const sanitizeValue = (value: unknown, seen: WeakSet<object>): unknown => {
  if (value === null || value === undefined) return value;
  const valueType = typeof value;
  if (valueType === "string" || valueType === "number" || valueType === "boolean") {
    return value;
  }
  if (valueType === "bigint") return value.toString();
  if (valueType === "symbol") return value.toString();
  if (valueType === "function") return undefined;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen));
  }
  if (valueType !== "object") return value;

  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return { message: value.message };

  const obj = value as Record<string, unknown>;
  if (seen.has(obj)) return "[Circular]";
  seen.add(obj);

  const output: Record<string, unknown> = {};
  Object.entries(obj).forEach(([key, val]) => {
    if (REDACT_KEYS.has(key.toLowerCase())) {
      output[key] = "[REDACTED]";
      return;
    }
    const sanitized = sanitizeValue(val, seen);
    if (sanitized !== undefined) output[key] = sanitized;
  });

  seen.delete(obj);
  return output;
};

const sanitizePayload = (payload?: Record<string, unknown>) => {
  if (!payload) return undefined;
  try {
    return sanitizeValue(payload, new WeakSet()) as Record<string, unknown>;
  } catch {
    return undefined;
  }
};

export const trackEvent = (eventName: string, payload?: Record<string, unknown>) => {
  if (!ANALYTICS_ENABLED || typeof window === "undefined") return;

  const event: Record<string, unknown> = {
    event: eventName,
    timestamp: new Date().toISOString(),
    page_url: sanitizeUrl(window.location.href),
    session_id: ensureSessionId(),
    payload: sanitizePayload(payload),
  };

  buffer.push(event);
  if (buffer.length > MAX_BUFFER_SIZE) {
    buffer.splice(0, buffer.length - MAX_BUFFER_SIZE);
  }
};

export const getEventBuffer = () => buffer.slice();

export const clearEventBuffer = () => {
  buffer.length = 0;
};
