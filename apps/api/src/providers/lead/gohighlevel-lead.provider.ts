"use strict";

import type { NormalizedLead } from "../../types/lead";
import type { LeadProvider, LeadResult } from "./lead-provider.interface";

const webhookUrl = process.env.GHL_WEBHOOK_URL;
const authToken = process.env.GHL_WEBHOOK_AUTH ?? process.env.GHL_API_KEY;

export class GoHighLevelLeadProvider implements LeadProvider {
  async sendLead(lead: NormalizedLead): Promise<LeadResult> {
    if (!webhookUrl) {
      return {
        success: false,
        provider: "gohighlevel",
        message: "GoHighLevel not configured",
      };
    }

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(lead),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return {
          success: false,
          provider: "gohighlevel",
          message:
            text?.trim().length > 0
              ? `GoHighLevel request failed (${res.status}): ${text}`
              : `GoHighLevel request failed (${res.status})`,
        };
      }

      return { success: true, provider: "gohighlevel" };
    } catch (error) {
      console.error("[GoHighLevelLeadProvider] Request error", error);
      return {
        success: false,
        provider: "gohighlevel",
        message: "GoHighLevel request error",
      };
    }
  }
}
