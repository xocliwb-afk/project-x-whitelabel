import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock('@project-x/database', () => ({
  Prisma: {},
  prisma: {
    tour: {
      findFirst: mocks.findFirst,
      findMany: mocks.findMany,
      create: mocks.create,
      update: mocks.update,
      deleteMany: mocks.deleteMany,
    },
  },
}));

describe('tour.repository access scoping', () => {
  let tourRepository: typeof import('../tour.repository');

  beforeEach(async () => {
    vi.clearAllMocks();
    tourRepository = await import('../tour.repository');
  });

  it('scopes consumer lookups to the requesting user within the tenant', async () => {
    mocks.findFirst.mockResolvedValue(null);

    await tourRepository.findById('tour-1', {
      tenantId: 'tenant-1',
      userId: 'consumer-1',
      role: 'CONSUMER',
    });

    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'tour-1',
        tenantId: 'tenant-1',
        userId: 'consumer-1',
      },
      include: {
        stops: {
          orderBy: { order: 'asc' },
        },
      },
    });
  });

  it.each(['AGENT', 'ADMIN'] as const)(
    'allows %s to access tenant tours without an owner filter but still within the tenant',
    async (role) => {
      mocks.findMany.mockResolvedValue([]);

      await tourRepository.findAll({
        tenantId: 'tenant-1',
        userId: 'staff-1',
        role,
      });

      expect(mocks.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
        },
        include: {
          stops: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    },
  );
});
