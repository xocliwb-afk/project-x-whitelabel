"use strict";

import type { NormalizedLead } from "../../types/lead";

export type LeadResult = {
  success: boolean;
  message?: string;
  /** Error classification code for structured error handling. */
  code?: "NOT_CONFIGURED" | "VALIDATION_ERROR" | "RATE_LIMITED" | "PROVIDER_ERROR";
  provider: string;
};

export interface LeadProvider {
  sendLead(lead: NormalizedLead): Promise<LeadResult>;
}
