"use strict";

import type { NormalizedLead } from "../../types/lead";

export type LeadResult = {
  success: boolean;
  message?: string;
  provider: string;
};

export interface LeadProvider {
  sendLead(lead: NormalizedLead): Promise<LeadResult>;
}
