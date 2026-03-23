"use strict";

export type LeadRequest = {
  listingId?: string;
  listingAddress?: string;
  message?: string;
  context?: string;
  name?: string;
  email?: string;
  phone?: string;
  brokerId?: string;
  agentId?: string;
  source?: string;
  captchaToken?: string;
};

export type NormalizedLead = {
  listingId?: string;
  listingAddress?: string;
  message?: string;
  context?: string;
  name: string;
  email?: string;
  phone?: string;
  brokerId: string;
  agentId?: string;
  source: string;
  createdAt: string;
};
