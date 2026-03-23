import { getLeadProvider } from "../providers/lead/lead-provider.factory";
import type { LeadResult } from "../providers/lead/lead-provider.interface";
import type { LeadRequest, NormalizedLead } from "../types/lead";
import { CaptchaService } from "./captcha.service";

type LeadServiceResult = LeadResult & { status?: number };

export class LeadService {
  private captchaService: CaptchaService | null = null;

  private getCaptchaService(): CaptchaService {
    if (!this.captchaService) {
      this.captchaService = new CaptchaService();
    }
    return this.captchaService;
  }

  async submitLead(payload: LeadRequest): Promise<LeadServiceResult> {
    const validationError = this.validate(payload);
    if (validationError) {
      return validationError;
    }

    const captchaResult = await this.getCaptchaService().verify(payload.captchaToken, "submit_lead");
    if (!captchaResult.ok) {
      return {
        success: false,
        provider: "captcha",
        status: 400,
        message: "Captcha verification failed",
      };
    }

    const normalized = this.normalize(payload);
    const { provider, name: providerName } = getLeadProvider();
    const result = await provider.sendLead(normalized);

    this.logLeadEvent(normalized, providerName, result.success);

    let status: number | undefined;
    if (!result.success) {
      if (result.message?.includes("not configured")) {
        status = 503;
      } else if (providerName === "gohighlevel") {
        status = 502;
      } else {
        status = 500;
      }
    }

    return {
      ...result,
      provider: providerName,
      status,
    };
  }

  private validate(payload: LeadRequest): LeadServiceResult | null {
    const missing: string[] = [];
    if (!payload?.name?.trim()) missing.push("name");
    if (!payload?.brokerId?.trim()) missing.push("brokerId");

    const hasEmail = Boolean(payload?.email?.trim());
    const hasPhone = Boolean(payload?.phone?.trim());
    if (!hasEmail && !hasPhone) missing.push("email or phone");

    if (missing.length > 0) {
      return {
        success: false,
        provider: "validation",
        status: 400,
        message: `Missing required fields: ${missing.join(", ")}`,
      };
    }

    return null;
  }

  private normalize(payload: LeadRequest): NormalizedLead {
    const trimmed = (value?: string) => value?.trim() || undefined;
    const normalizePhone = (value?: string) => {
      if (!value) return undefined;
      const digits = value.replace(/[^\d+]/g, "");
      return digits || undefined;
    };

    const normalizeContext = (value?: string) => {
      const ctx = trimmed(value);
      if (!ctx) return undefined;
      if (ctx.length > 8192) return undefined;
      try {
        JSON.parse(ctx);
      } catch {
        return undefined;
      }
      return ctx;
    };

    return {
      listingId: trimmed(payload.listingId),
      listingAddress: trimmed(payload.listingAddress),
      message: trimmed(payload.message),
      context: normalizeContext(payload.context),
      name: trimmed(payload.name)!,
      email: trimmed(payload.email),
      phone: normalizePhone(payload.phone),
      brokerId: trimmed(payload.brokerId)!,
      agentId: trimmed(payload.agentId),
      source: trimmed(payload.source) || "project-x-web",
      createdAt: new Date().toISOString(),
    };
  }

  private logLeadEvent(lead: NormalizedLead, provider: string, success: boolean): void {
    console.log("[LeadService] Lead processed", {
      timestamp: new Date().toISOString(),
      brokerId: lead.brokerId,
      listingId: lead.listingId,
      source: lead.source,
      contextLength: lead.context?.length || 0,
      provider,
      success,
    });
  }
}
