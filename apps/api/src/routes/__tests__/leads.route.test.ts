import type { Server } from "node:http";

import express from "express";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  submitLead: vi.fn(),
  checkDailyLimit: vi.fn(),
  takeToken: vi.fn(),
}));

vi.mock("../../services/lead.service", () => ({
  LeadService: class {
    submitLead = mocks.submitLead;
  },
}));

vi.mock("../../services/rateLimiter.service", () => ({
  checkDailyLimit: (...args: any[]) => mocks.checkDailyLimit(...args),
  takeToken: (...args: any[]) => mocks.takeToken(...args),
}));

describe("leads route", () => {
  let router: express.Router;
  let serverInfo: { baseUrl: string; close: () => Promise<void> } | null = null;

  beforeAll(async () => {
    router = (await import("../leads.route")).default;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("LEADS_RATE_LIMIT_ENABLED", "false");
    mocks.checkDailyLimit.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
    mocks.takeToken.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    if (serverInfo) {
      await serverInfo.close();
      serverInfo = null;
    }
  });

  async function startServer() {
    const app = express();
    app.use(express.json());
    app.use("/api", router);

    const server = await new Promise<Server>((resolve) => {
      const instance = app.listen(0, () => resolve(instance));
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to resolve test server port");
    }

    const info = {
      baseUrl: `http://127.0.0.1:${address.port}`,
      close: () =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        }),
    };
    serverInfo = info;
    return info;
  }

  it("returns VALIDATION_ERROR when the lead service rejects the payload", async () => {
    mocks.submitLead.mockResolvedValue({
      success: false,
      provider: "validation",
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Missing required fields: name",
    });
    const { baseUrl } = await startServer();

    const response = await fetch(`${baseUrl}/api/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: true,
      message: "Missing required fields: name",
      code: "VALIDATION_ERROR",
      status: 400,
    });
  });

  it("returns RATE_LIMITED when the daily limit is exceeded", async () => {
    vi.stubEnv("LEADS_RATE_LIMIT_ENABLED", "true");
    mocks.checkDailyLimit.mockReturnValue({ allowed: false, retryAfterSeconds: 60 });
    const { baseUrl } = await startServer();

    const response = await fetch(`${baseUrl}/api/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Jane Doe", email: "jane@example.com", brokerId: "broker-1" }),
    });

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    await expect(response.json()).resolves.toEqual({
      error: true,
      message: "Daily lead limit reached",
      code: "RATE_LIMITED",
      status: 429,
    });
  });

  it("returns LEAD_SUBMISSION_FAILED for provider failures", async () => {
    mocks.submitLead.mockResolvedValue({
      success: false,
      provider: "mock",
      status: 503,
      code: "NOT_CONFIGURED",
      message: "Lead provider is not configured",
    });
    const { baseUrl } = await startServer();

    const response = await fetch(`${baseUrl}/api/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Jane Doe", email: "jane@example.com", brokerId: "broker-1" }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: true,
      message: "Lead provider is not configured",
      code: "LEAD_SUBMISSION_FAILED",
      status: 503,
    });
  });
});
