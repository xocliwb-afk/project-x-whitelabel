import type { Server } from "node:http";

import express from "express";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node-fetch", () => ({
  default: vi.fn(),
}));

describe("geo route", () => {
  let router: express.Router;
  let serverInfo: { baseUrl: string; close: () => Promise<void> } | null = null;

  beforeAll(async () => {
    router = (await import("../geo.route")).default;
  });

  beforeEach(() => {
    vi.unstubAllEnvs();
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
    app.use("/api/geo", router);

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

  it("returns VALIDATION_ERROR when query is missing", async () => {
    const { baseUrl } = await startServer();

    const response = await fetch(`${baseUrl}/api/geo/geocode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: true,
      message: "Query is required",
      code: "VALIDATION_ERROR",
      status: 400,
    });
  });

  it("returns GEO_LOOKUP_FAILED when the provider is not configured", async () => {
    vi.stubEnv("MAPBOX_GEOCODE_TOKEN", "");
    const { baseUrl } = await startServer();

    const response = await fetch(`${baseUrl}/api/geo/geocode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "Detroit" }),
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: true,
      message: "Mapbox geocoding is not configured",
      code: "GEO_LOOKUP_FAILED",
      status: 503,
    });
  });
});
