import type { LeadPayload, CRMConfig } from '@project-x/shared-types';
import { CrmProvider } from './crm-provider.interface';
import { WebhookConnector } from '../../connectors/webhook.connector';

/**
 * WebhookCrmProvider delegates to the existing WebhookConnector implementation
 * to send leads to a configured webhook endpoint.
 */
export class WebhookCrmProvider implements CrmProvider {
  private connector: WebhookConnector;

  constructor() {
    this.connector = new WebhookConnector();
  }

  async createLead(lead: LeadPayload, config: CRMConfig): Promise<void> {
    await this.connector.sendLead(lead, config);
  }
}
