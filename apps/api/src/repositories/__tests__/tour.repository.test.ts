import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock('@project-x/database', () => ({
  Prisma: {},
  prisma: {
    tour: {
      findFirst: mocks.findFirst,
      findMany: mocks.findMany,
      create: mocks.create,
      updateMany: mocks.updateMany,
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

  it('updates tours atomically within the scoped tenant and user boundary', async () => {
    const updatedTour = {
      id: 'tour-1',
      tenantId: 'tenant-1',
      userId: 'consumer-1',
      stops: [],
    };
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.findFirst.mockResolvedValue(updatedTour);

    const result = await tourRepository.update(
      'tour-1',
      {
        tenantId: 'tenant-1',
        userId: 'consumer-1',
        role: 'CONSUMER',
      },
      {
        title: 'Updated title',
      },
    );

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'tour-1',
        tenantId: 'tenant-1',
        userId: 'consumer-1',
      },
      data: {
        title: 'Updated title',
        narrationPayloads: undefined,
      },
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
    expect(result).toEqual(updatedTour);
  });
});
