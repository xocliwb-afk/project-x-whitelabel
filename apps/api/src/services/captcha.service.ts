const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

type CaptchaVerifyResult = {
  ok: boolean;
  reason?: string;
  score?: number;
  action?: string;
};

export class CaptchaService {
  private secret: string | undefined;
  private disabled: boolean;

  constructor() {
    this.secret = process.env.RECAPTCHA_SECRET_KEY;
    this.disabled = process.env.CAPTCHA_DISABLED === "true";

    const isProd = process.env.NODE_ENV === "production";
    if (this.disabled && isProd) {
      throw new Error("Captcha cannot be disabled in production");
    }

    if (!this.disabled && !this.secret) {
      throw new Error("Missing RECAPTCHA_SECRET_KEY");
    }
  }

  async verify(token?: string, expectedAction = "submit_lead"): Promise<CaptchaVerifyResult> {
    if (this.disabled) {
      return { ok: true, reason: "captcha_disabled" };
    }

    if (!token) {
      return { ok: false, reason: "missing_token" };
    }

    const body = new URLSearchParams({
      secret: this.secret || "",
      response: token,
    }).toString();

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      return { ok: false, reason: `http_${res.status}` };
    }

    const data = (await res.json().catch(() => null)) || {};
    if (!data.success) {
      const errors = Array.isArray(data["error-codes"]) ? data["error-codes"].join(",") : "verification_failed";
      return { ok: false, reason: errors };
    }

    const action = typeof data.action === "string" ? data.action : undefined;
    const score = typeof data.score === "number" ? data.score : undefined;

    if (action && expectedAction && action !== expectedAction) {
      return { ok: false, reason: "action_mismatch", action, score };
    }

    if (typeof score === "number" && score < 0.5) {
      return { ok: false, reason: "low_score", action, score };
    }

    return { ok: true, action, score };
  }
}
