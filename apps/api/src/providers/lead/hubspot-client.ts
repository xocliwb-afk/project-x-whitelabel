const BASE_URL = "https://api.hubapi.com";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

type ContactProperties = Record<string, string | undefined>;

/** Classified HubSpot API error for structured error handling. */
export class HubSpotApiError extends Error {
  readonly statusCode: number;
  readonly category: "auth" | "rate_limit" | "validation" | "server" | "network";
  readonly retryable: boolean;

  constructor(
    message: string,
    statusCode: number,
    category: HubSpotApiError["category"],
    retryable: boolean,
  ) {
    super(message);
    this.name = "HubSpotApiError";
    this.statusCode = statusCode;
    this.category = category;
    this.retryable = retryable;
  }
}

export class HubSpotClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Parse and classify an error response from HubSpot.
   * Never leaks the API token or raw error bodies to callers.
   */
  private async classifyError(res: Response): Promise<HubSpotApiError> {
    let errorBody = "";
    try {
      errorBody = await res.text();
    } catch {
      // ignore
    }

    // Log internally for debugging (never sent to client)
    console.error("[HubSpot] API error", res.status, errorBody || "<empty>");

    const status = res.status;

    if (status === 401 || status === 403) {
      return new HubSpotApiError(
        "HubSpot authentication failed",
        status,
        "auth",
        false,
      );
    }

    if (status === 429) {
      return new HubSpotApiError(
        "HubSpot rate limit exceeded",
        status,
        "rate_limit",
        true,
      );
    }

    if (status === 400 || status === 422) {
      // Parse validation message if available, but sanitize it
      let detail = "Invalid request to HubSpot";
      try {
        const parsed = JSON.parse(errorBody);
        if (parsed?.message && typeof parsed.message === "string") {
          // Only include the category, not raw field data
          detail = `HubSpot validation error: ${parsed.category || "VALIDATION_ERROR"}`;
        }
      } catch {
        // ignore parse failure
      }
      return new HubSpotApiError(detail, status, "validation", false);
    }

    if (status >= 500) {
      return new HubSpotApiError(
        "HubSpot server error",
        status,
        "server",
        true,
      );
    }

    return new HubSpotApiError(
      `HubSpot request failed (${status})`,
      status,
      "server",
      status >= 500,
    );
  }

  /**
   * Execute a fetch request with retry on retryable errors.
   * Uses exponential backoff: 500ms, 1000ms, 2000ms.
   */
  private async fetchWithRetry(
    url: string,
    init: RequestInit,
  ): Promise<any | null> {
    let lastError: HubSpotApiError | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }

      let res: Response;
      try {
        res = await fetch(url, init);
      } catch (err) {
        // Network error — retryable
        lastError = new HubSpotApiError(
          "Network error connecting to HubSpot",
          0,
          "network",
          true,
        );
        console.error("[HubSpot] Network error on attempt", attempt + 1, err);
        continue;
      }

      if (res.ok) {
        try {
          return await res.json();
        } catch {
          return null;
        }
      }

      lastError = await this.classifyError(res);

      if (!lastError.retryable) {
        throw lastError;
      }

      console.warn(
        `[HubSpot] Retryable error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`,
        lastError.message,
      );
    }

    // All retries exhausted
    throw lastError ?? new HubSpotApiError("All retries failed", 0, "network", false);
  }

  async searchContactByEmail(email: string): Promise<string | null> {
    const url = `${BASE_URL}/crm/v3/objects/contacts/search`;
    const body = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "email",
              operator: "EQ",
              value: email,
            },
          ],
        },
      ],
      properties: ["email", "firstname", "lastname", "phone"],
      limit: 1,
    };

    const data = await this.fetchWithRetry(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    const firstResult = data?.results?.[0];
    return firstResult?.id ? String(firstResult.id) : null;
  }

  async updateContact(contactId: string, properties: ContactProperties): Promise<string | null> {
    const url = `${BASE_URL}/crm/v3/objects/contacts/${encodeURIComponent(contactId)}`;
    const data = await this.fetchWithRetry(url, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify({ properties }),
    });

    if (data?.id) return String(data.id);
    return null;
  }

  async createContact(properties: ContactProperties): Promise<string | null> {
    const url = `${BASE_URL}/crm/v3/objects/contacts`;
    const data = await this.fetchWithRetry(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ properties }),
    });

    if (data?.id) return String(data.id);
    return null;
  }
}
