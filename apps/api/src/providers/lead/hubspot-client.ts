const BASE_URL = "https://api.hubapi.com";

type ContactProperties = Record<string, string | undefined>;

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

  private async handleResponse(res: Response): Promise<any | null> {
    if (res.ok) {
      try {
        return await res.json();
      } catch {
        return null;
      }
    }

    let errorText = "";
    try {
      errorText = await res.text();
    } catch {
      // ignore
    }
    // eslint-disable-next-line no-console
    console.error("[HubSpot] API error", res.status, errorText || "<empty>");
    return null;
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

    const res = await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    const data = await this.handleResponse(res);
    const firstResult = data?.results?.[0];
    return firstResult?.id ? String(firstResult.id) : null;
  }

  async updateContact(contactId: string, properties: ContactProperties): Promise<string | null> {
    const url = `${BASE_URL}/crm/v3/objects/contacts/${encodeURIComponent(contactId)}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify({ properties }),
    });

    const data = await this.handleResponse(res);
    if (data?.id) return String(data.id);
    return null;
  }

  async createContact(properties: ContactProperties): Promise<string | null> {
    const url = `${BASE_URL}/crm/v3/objects/contacts`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ properties }),
    });

    const data = await this.handleResponse(res);
    if (data?.id) return String(data.id);
    return null;
  }
}
