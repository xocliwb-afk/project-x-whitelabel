import type { NormalizedLead } from "../../types/lead";
import type { LeadProvider, LeadResult } from "./lead-provider.interface";
import { HubSpotClient } from "./hubspot-client";

const buildName = (fullName: string): { firstname: string; lastname: string } => {
  const parts = (fullName || "").trim().split(/\s+/);
  const firstname = parts.shift() || "";
  const lastname = parts.join(" ");
  return { firstname, lastname };
};

export class HubSpotLeadProvider implements LeadProvider {
  async sendLead(lead: NormalizedLead): Promise<LeadResult> {
    const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
    if (!token) {
      return {
        success: false,
        provider: "hubspot",
        message: "HubSpot not configured (missing HUBSPOT_PRIVATE_APP_TOKEN)",
      };
    }

    const client = new HubSpotClient(token);
    const { firstname, lastname } = buildName(lead.name);

    const baseProperties: Record<string, string> = {
      firstname,
      lastname,
    };
    if (lead.email) baseProperties.email = lead.email;
    if (lead.phone) baseProperties.phone = lead.phone;

    let contactId: string | null = null;
    if (lead.email) {
      contactId = await client.searchContactByEmail(lead.email);
      if (contactId) {
        const updated = await client.updateContact(contactId, baseProperties);
        if (!updated) {
          return {
            success: false,
            provider: "hubspot",
            message: "Failed to create/update HubSpot contact",
          };
        }
      } else {
        contactId = await client.createContact(baseProperties);
        if (!contactId) {
          return {
            success: false,
            provider: "hubspot",
            message: "Failed to create/update HubSpot contact",
          };
        }
      }
    } else {
      contactId = await client.createContact(baseProperties);
      if (!contactId) {
        return {
          success: false,
          provider: "hubspot",
          message: "Failed to create/update HubSpot contact",
        };
      }
    }

    return { success: true, provider: "hubspot" };
  }
}
