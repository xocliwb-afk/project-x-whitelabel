import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verifySupabaseToken: vi.fn(),
  prismaUserFindUnique: vi.fn(),
}));

class MockAuthTokenError extends Error {
  status = 401;
}

vi.mock('../../lib/jwt', () => ({
  AuthTokenError: MockAuthTokenError,
  isAuthTokenError: (error: unknown) => error instanceof MockAuthTokenError,
  verifySupabaseToken: mocks.verifySupabaseToken,
}));

vi.mock('@project-x/database', () => ({
  prisma: {
    user: {
      findUnique: mocks.prismaUserFindUnique,
    },
  },
}));

describe('auth middleware', () => {
  let requireAuth: typeof import('../auth').requireAuth;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ requireAuth } = await import('../auth'));
  });

  it('returns USER_NOT_PROVISIONED when a valid token has no local user', async () => {
    mocks.verifySupabaseToken.mockResolvedValue({
      sub: 'supabase-user-1',
      email: 'consumer@example.com',
      tenantId: 'tenant-1',
    });
    mocks.prismaUserFindUnique.mockResolvedValue(null);

    const req = {
      headers: { authorization: 'Bearer token-1' },
      tenantId: 'tenant-1',
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any;
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      message: 'User not provisioned',
      code: 'USER_NOT_PROVISIONED',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns TENANT_MISMATCH when a valid token resolves to a user in another tenant', async () => {
    mocks.verifySupabaseToken.mockResolvedValue({
      sub: 'supabase-user-1',
      email: 'consumer@example.com',
      tenantId: 'tenant-1',
    });
    mocks.prismaUserFindUnique.mockResolvedValue({
      id: 'user-1',
      supabaseId: 'supabase-user-1',
      tenantId: 'tenant-2',
      email: 'consumer@example.com',
      displayName: null,
      phone: null,
      role: 'CONSUMER',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = {
      headers: { authorization: 'Bearer token-1' },
      tenantId: 'tenant-1',
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as any;
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: true,
      message: 'Tenant mismatch',
      code: 'TENANT_MISMATCH',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
