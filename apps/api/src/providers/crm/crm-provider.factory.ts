import type { CRMConfig } from '@project-x/shared-types';
import { CrmProvider } from './crm-provider.interface';
import { NullCrmProvider } from './null-crm.provider';
import { WebhookCrmProvider } from './webhook-crm.provider';

// Stateless singletons
const nullProvider = new NullCrmProvider();
const webhookProvider = new WebhookCrmProvider();

/**
 * Returns the appropriate CrmProvider implementation based on CRMConfig.
 */
export function getCrmProvider(config: CRMConfig): CrmProvider {
  switch (config.crmType) {
    case 'webhook':
      return webhookProvider;

    case 'hubspot':
    case 'email':
    case 'null':
    default:
      return nullProvider;
  }
}
