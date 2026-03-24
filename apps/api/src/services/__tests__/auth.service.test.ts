import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSupabaseAdmin: vi.fn(),
  upsertBySupabaseId: vi.fn(),
  create: vi.fn(),
  findBySupabaseId: vi.fn(),
  update: vi.fn(),
  findById: vi.fn(),
}));

vi.mock('../../lib/supabase-admin', () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
}));

vi.mock('../../repositories/user.repository', () => ({
  upsertBySupabaseId: mocks.upsertBySupabaseId,
  create: mocks.create,
  findBySupabaseId: mocks.findBySupabaseId,
  update: mocks.update,
  findById: mocks.findById,
}));

describe('auth.service', () => {
  let authService: typeof import('../auth.service');

  beforeEach(async () => {
    vi.clearAllMocks();
    authService = await import('../auth.service');
  });

  it('provisions a local user from verified token claims without calling Supabase signup', async () => {
    const now = new Date('2026-03-23T00:00:00.000Z');
    mocks.upsertBySupabaseId.mockResolvedValue({
      id: 'user-1',
      supabaseId: 'supabase-user-1',
      tenantId: 'tenant-1',
      email: 'agent@example.com',
      displayName: 'Agent Smith',
      phone: '555-1111',
      role: 'CONSUMER',
      createdAt: now,
      updatedAt: now,
    });

    const result = await authService.createOrProvisionLocalUser(
      'supabase-user-1',
      'agent@example.com',
      'tenant-1',
      'Agent Smith',
      '555-1111',
    );

    expect(mocks.upsertBySupabaseId).toHaveBeenCalledWith({
      supabaseId: 'supabase-user-1',
      tenantId: 'tenant-1',
      email: 'agent@example.com',
      displayName: 'Agent Smith',
      phone: '555-1111',
    });
    expect(mocks.getSupabaseAdmin).not.toHaveBeenCalled();
    expect(result.user).toEqual(
      expect.objectContaining({
        id: 'user-1',
        supabaseId: 'supabase-user-1',
        tenantId: 'tenant-1',
        email: 'agent@example.com',
      }),
    );
  });

  it('uses upsert for concurrent first-login attempts instead of duplicate create logic', async () => {
    const now = new Date('2026-03-23T00:00:00.000Z');
    mocks.getSupabaseAdmin.mockReturnValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'supabase-user-1',
              email: 'consumer@example.com',
            },
            session: {
              access_token: 'access-token',
              refresh_token: 'refresh-token',
              expires_at: 12345,
            },
          },
          error: null,
        }),
      },
    });
    mocks.upsertBySupabaseId.mockResolvedValue({
      id: 'user-1',
      supabaseId: 'supabase-user-1',
      tenantId: 'tenant-1',
      email: 'consumer@example.com',
      displayName: null,
      phone: null,
      role: 'CONSUMER',
      createdAt: now,
      updatedAt: now,
    });

    const [first, second] = await Promise.all([
      authService.login('consumer@example.com', 'password', 'tenant-1'),
      authService.login('consumer@example.com', 'password', 'tenant-1'),
    ]);

    expect(mocks.upsertBySupabaseId).toHaveBeenCalledTimes(2);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(first.user.id).toBe('user-1');
    expect(second.user.id).toBe('user-1');
  });
});
