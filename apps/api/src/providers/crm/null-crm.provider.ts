import type { LeadPayload, CRMConfig } from '@project-x/shared-types';
import { CrmProvider } from './crm-provider.interface';

/**
 * NullCrmProvider is the default "no-op" CRM provider.
 * It records that a lead was received but does not make any external calls.
 */
export class NullCrmProvider implements CrmProvider {
  async createLead(lead: LeadPayload, config: CRMConfig): Promise<void> {
    console.log('[NullCrmProvider] Lead captured (no external CRM call):', {
      brokerId: config.brokerId,
      source: lead.source,
      listingId: lead.listingId,
    });

    // No external side effects
    return Promise.resolve();
  }
}
