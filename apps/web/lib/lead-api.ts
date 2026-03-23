import { getApiBaseUrl } from "./getApiBaseUrl";

const API_BASE_URL = getApiBaseUrl();

export type LeadSubmitPayload = {
  listingId?: string;
  listingAddress?: string;
  message?: string;
  context?: string;
  name: string;
  email?: string;
  phone?: string;
  brokerId: string;
  agentId?: string;
  source?: string;
  captchaToken?: string;
};

export type SubmitLeadResult = {
  success: boolean;
  message?: string;
};

export async function submitLead(payload: LeadSubmitPayload): Promise<SubmitLeadResult> {
  const normalizedPayload: LeadSubmitPayload = {
    ...payload,
    source: payload.source ?? 'project-x-web',
  };

  try {
    const res = await fetch(`${API_BASE_URL}/api/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalizedPayload),
    });

    if (!res.ok) {
      let errorMessage = 'Failed to submit lead';

      try {
        const errorData = (await res.json()) as { message?: string };
        if (errorData?.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // ignore JSON parse errors
      }

      return { success: false, message: errorMessage };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      message: 'A network error occurred. Please try again.',
    };
  }
}
