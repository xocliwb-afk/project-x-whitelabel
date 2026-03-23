import { describe, it, expect, beforeAll, beforeEach, vi, afterEach } from "vitest";
import { getMockLeadLog } from "../../providers/lead/mock-lead.provider";

// Set env before importing LeadService (CaptchaService reads env in constructor)
vi.stubEnv("CAPTCHA_DISABLED", "true");
vi.stubEnv("LEAD_PROVIDER", "mock");
vi.stubEnv("NODE_ENV", "test");

// Use dynamic import inside describe to avoid top-level await (commonjs tsconfig)
describe("LeadService", () => {
  let LeadService: typeof import("../lead.service").LeadService;
  let service: InstanceType<typeof LeadService>;

  beforeAll(async () => {
    const mod = await import("../lead.service");
    LeadService = mod.LeadService;
  });

  beforeEach(() => {
    service = new LeadService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects payload missing name", async () => {
    const result = await service.submitLead({
      email: "test@example.com",
      brokerId: "broker-1",
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toContain("name");
  });

  it("rejects payload missing both email and phone", async () => {
    const result = await service.submitLead({
      name: "Jane Doe",
      brokerId: "broker-1",
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toContain("email or phone");
  });

  it("rejects payload missing brokerId", async () => {
    const result = await service.submitLead({
      name: "Jane Doe",
      email: "jane@example.com",
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.message).toContain("brokerId");
  });

  it("submits valid lead with email via mock provider", async () => {
    const logBefore = getMockLeadLog().length;

    const result = await service.submitLead({
      name: "Jane Doe",
      email: "jane@example.com",
      brokerId: "broker-1",
      listingId: "listing-123",
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe("mock");

    const log = getMockLeadLog();
    expect(log.length).toBe(logBefore + 1);

    const captured = log[log.length - 1];
    expect(captured.name).toBe("Jane Doe");
    expect(captured.email).toBe("jane@example.com");
    expect(captured.brokerId).toBe("broker-1");
    expect(captured.listingId).toBe("listing-123");
    expect(captured.source).toBe("project-x-web");
    expect(captured.createdAt).toBeTruthy();
  });

  it("submits valid lead with phone only", async () => {
    const result = await service.submitLead({
      name: "John Smith",
      phone: "(555) 123-4567",
      brokerId: "broker-2",
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe("mock");

    const log = getMockLeadLog();
    const captured = log[log.length - 1];
    expect(captured.phone).toBe("5551234567");
  });

  it("returns consistent LeadResult shape on success", async () => {
    const result = await service.submitLead({
      name: "Test User",
      email: "test@example.com",
      brokerId: "broker-1",
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        provider: expect.any(String),
      }),
    );
  });
});
