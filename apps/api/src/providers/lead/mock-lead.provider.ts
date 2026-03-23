"use strict";

import type { NormalizedLead } from "../../types/lead";
import type { LeadProvider, LeadResult } from "./lead-provider.interface";

const MAX_LOGS = 50;
const leadLog: NormalizedLead[] = [];

export function getMockLeadLog(): NormalizedLead[] {
  return [...leadLog];
}

export class MockLeadProvider implements LeadProvider {
  async sendLead(lead: NormalizedLead): Promise<LeadResult> {
    leadLog.push(lead);
    if (leadLog.length > MAX_LOGS) {
      leadLog.shift();
    }

    console.log("[MockLeadProvider] Lead captured (in-memory)", {
      listingId: lead.listingId,
      source: lead.source,
      createdAt: lead.createdAt,
    });

    return { success: true, provider: "mock" };
  }
}
