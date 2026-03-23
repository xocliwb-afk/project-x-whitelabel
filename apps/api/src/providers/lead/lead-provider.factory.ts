"use strict";

import { HubSpotLeadProvider } from "./hubspot-lead.provider";
import { LeadProvider } from "./lead-provider.interface";
import { MockLeadProvider } from "./mock-lead.provider";

const mockProvider = new MockLeadProvider();
const hubSpotProvider = new HubSpotLeadProvider();

export function getLeadProvider(): { name: string; provider: LeadProvider } {
  const providerName = (process.env.LEAD_PROVIDER ?? "mock").toLowerCase();

  switch (providerName) {
    case "hubspot":
      return { name: "hubspot", provider: hubSpotProvider };
    case "mock":
    default:
      return { name: "mock", provider: mockProvider };
  }
}
