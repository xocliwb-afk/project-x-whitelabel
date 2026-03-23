const MAX_CONTEXT_LENGTH = 8192;
const MAX_URL_LENGTH = 1000;
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

type BuildLeadContextOptions = {
  page_type: string;
  page_slug?: string;
  listingId?: string;
  listingAddress?: string;
  source?: string;
  intent?: string;
  entry_source?: string;
};

const sanitizeUrl = (raw?: string): string | undefined => {
  if (typeof window === "undefined") return undefined;
  const href = raw || window.location.href;
  try {
    const url = new URL(href);
    PII_QUERY_KEYS.forEach((key) => {
      url.searchParams.delete(key);
      url.searchParams.delete(key.toLowerCase());
    });
    const output = url.toString();
    return output.length > MAX_URL_LENGTH ? output.slice(0, MAX_URL_LENGTH) : output;
  } catch {
    return undefined;
  }
};

const sanitizeReferrer = (): string | undefined => {
  if (typeof document === "undefined") return undefined;
  const ref = document.referrer || "";
  if (!ref) return undefined;
  try {
    const url = new URL(ref);
    PII_QUERY_KEYS.forEach((key) => {
      url.searchParams.delete(key);
      url.searchParams.delete(key.toLowerCase());
    });
    const output = url.toString();
    return output.length > MAX_URL_LENGTH ? output.slice(0, MAX_URL_LENGTH) : output;
  } catch {
    return undefined;
  }
};

export const buildLeadContext = (options: BuildLeadContextOptions): string | undefined => {
  try {
    if (typeof window === "undefined") return undefined;

    const pageUrl = sanitizeUrl();
    const referrer = sanitizeReferrer();
    const params = new URLSearchParams(window.location.search || "");
    const pickUtm = (key: string) => {
      const val = params.get(key);
      return val ? val.slice(0, 300) : undefined;
    };

    const now = new Date().toISOString();
    const pageSlug =
      options.page_slug ||
      (window.location.pathname || "")
        .replace(/^\/+/, "")
        .replace(/\.html$/, "") ||
      undefined;

    const ctxBase: Record<string, unknown> = {
      ctx_v: 1,
      page_url: pageUrl,
      page_type: options.page_type,
      page_slug: pageSlug,
      referrer,
      utm_source: pickUtm("utm_source"),
      utm_medium: pickUtm("utm_medium"),
      utm_campaign: pickUtm("utm_campaign"),
      utm_term: pickUtm("utm_term"),
      utm_content: pickUtm("utm_content"),
      listing_id: options.listingId,
      listing_address: options.listingAddress,
      source: options.source,
      intent: options.intent,
      entry_source: options.entry_source,
      timestamp: now,
      viewport_width: typeof window !== "undefined" ? window.innerWidth : undefined,
      viewport_height: typeof window !== "undefined" ? window.innerHeight : undefined,
    };

    // remove undefined fields
    Object.keys(ctxBase).forEach((key) => {
      if (ctxBase[key] === undefined || ctxBase[key] === null || ctxBase[key] === "") {
        delete ctxBase[key];
      }
    });

    const dropOrder = [
      "utm_content",
      "utm_term",
      "referrer",
      "viewport_width",
      "viewport_height",
      "listing_address",
    ];

    const safeStringify = (obj: Record<string, unknown>): string => JSON.stringify(obj);

    let json = safeStringify(ctxBase);
    if (json.length <= MAX_CONTEXT_LENGTH) return json;

    const working: Record<string, unknown> = { ...ctxBase };
    for (const key of dropOrder) {
      if (key in working) {
        delete working[key];
        json = safeStringify(working);
        if (json.length <= MAX_CONTEXT_LENGTH) return json;
      }
    }

    const minimal = {
      ctx_v: 1,
      page_url: pageUrl,
      page_type: options.page_type,
      timestamp: now,
      truncated: true,
    };
    return safeStringify(minimal);
  } catch {
    return undefined;
  }
};
