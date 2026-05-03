import type { Server } from "node:http";

import cors from "cors";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildCorsOptions } from "../../cors-options";

describe("CORS preflight", () => {
  let serverInfo: { baseUrl: string; close: () => Promise<void> } | null = null;

  afterEach(async () => {
    vi.unstubAllEnvs();
    if (serverInfo) {
      await serverInfo.close();
      serverInfo = null;
    }
  });

  async function startServer() {
    const app = express();
    app.options("*", cors(buildCorsOptions()));

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

  async function preflight(origin: string) {
    const { baseUrl } = await startServer();
    return fetch(`${baseUrl}/api/leads`, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type, Authorization, x-tenant-id",
      },
    });
  }

  it("echoes an allowed configured origin and expected methods/headers", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://app.example.com");

    const response = await preflight("https://app.example.com");

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://app.example.com");
    expect(response.headers.get("access-control-allow-methods")?.split(",").map((value) => value.trim())).toEqual([
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ]);
    expect(response.headers.get("access-control-allow-headers")?.split(",").map((value) => value.trim())).toEqual([
      "Content-Type",
      "Authorization",
      "x-tenant-id",
    ]);
  });

  it("does not echo a disallowed configured origin", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "https://app.example.com");

    const response = await preflight("https://evil.example.com");

    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("allows localhost origins when ALLOWED_ORIGINS is unset", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "");

    const response = await preflight("http://localhost:3000");

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
  });
});
