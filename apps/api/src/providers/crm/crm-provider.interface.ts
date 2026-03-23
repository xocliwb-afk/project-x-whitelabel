import type { LeadPayload, CRMConfig } from '@project-x/shared-types';

/**
 * CrmProvider abstracts a downstream CRM integration.
 * It receives a normalized LeadPayload and a CRMConfig that describes
 * how to talk to the downstream system (webhook, API client, etc).
 */
export interface CrmProvider {
  /**
   * Sends a lead to the configured CRM system.
   * @param lead - The lead data payload.
   * @param config - The broker-specific configuration for this CRM.
   */
  createLead(lead: LeadPayload, config: CRMConfig): Promise<void>;
}
