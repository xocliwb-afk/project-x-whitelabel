import type { NormalizedLead } from "../../types/lead";
import type { LeadProvider, LeadResult } from "./lead-provider.interface";
import { HubSpotClient, HubSpotApiError } from "./hubspot-client";

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

    try {
      let contactId: string | null = null;

      if (lead.email) {
        // Create-or-update: search by email first to avoid duplicates
        contactId = await client.searchContactByEmail(lead.email);
        if (contactId) {
          const updated = await client.updateContact(contactId, baseProperties);
          if (!updated) {
            return {
              success: false,
              provider: "hubspot",
              message: "Failed to update HubSpot contact",
            };
          }
        } else {
          contactId = await client.createContact(baseProperties);
          if (!contactId) {
            return {
              success: false,
              provider: "hubspot",
              message: "Failed to create HubSpot contact",
            };
          }
        }
      } else {
        contactId = await client.createContact(baseProperties);
        if (!contactId) {
          return {
            success: false,
            provider: "hubspot",
            message: "Failed to create HubSpot contact",
          };
        }
      }

      return { success: true, provider: "hubspot" };
    } catch (err) {
      if (err instanceof HubSpotApiError) {
        // Return classified error — never leak raw API details
        return {
          success: false,
          provider: "hubspot",
          message: this.classifyErrorMessage(err),
        };
      }

      // Unexpected error — log and return generic message
      console.error("[HubSpotLeadProvider] Unexpected error:", err);
      return {
        success: false,
        provider: "hubspot",
        message: "Failed to submit lead to HubSpot",
      };
    }
  }

  private classifyErrorMessage(err: HubSpotApiError): string {
    switch (err.category) {
      case "auth":
        return "CRM authentication error — please contact support";
      case "rate_limit":
        return "CRM is temporarily busy — please try again in a moment";
      case "validation":
        return "Lead data could not be processed by CRM";
      case "server":
        return "CRM service is temporarily unavailable";
      case "network":
        return "Unable to reach CRM service";
      default:
        return "Failed to submit lead to CRM";
    }
  }
}
