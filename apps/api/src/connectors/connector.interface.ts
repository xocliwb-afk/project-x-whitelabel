import { CRMConfig, LeadPayload } from '@project-x/shared-types';

export interface CrmConnector {
  sendLead(lead: LeadPayload, config: CRMConfig): Promise<void>;
}
