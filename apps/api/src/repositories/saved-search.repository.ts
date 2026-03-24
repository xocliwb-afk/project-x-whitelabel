import { Prisma, prisma } from '@project-x/database';
import type { SavedSearch } from '@project-x/database';

type SavedSearchDbClient = typeof prisma | Prisma.TransactionClient;

export async function findByUser(
  userId: string,
  tenantId: string,
  page: number,
  limit: number,
  db: SavedSearchDbClient = prisma,
): Promise<{ items: SavedSearch[]; total: number }> {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    db.savedSearch.findMany({
      where: { userId, tenantId },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
    db.savedSearch.count({
      where: { userId, tenantId },
    }),
  ]);

  return { items, total };
}

export async function findById(
  id: string,
  userId: string,
  tenantId: string,
  db: SavedSearchDbClient = prisma,
): Promise<SavedSearch | null> {
  return db.savedSearch.findFirst({
    where: { id, userId, tenantId },
  });
}

export async function findByHash(
  userId: string,
  tenantId: string,
  filtersHash: string,
  db: SavedSearchDbClient = prisma,
): Promise<SavedSearch | null> {
  return db.savedSearch.findFirst({
    where: { userId, tenantId, filtersHash },
  });
}

export async function create(
  data: {
    userId: string;
    tenantId: string;
    name: string;
    filters: Prisma.InputJsonValue;
    filtersHash: string;
    notifyNew: boolean;
  },
  db: SavedSearchDbClient = prisma,
): Promise<SavedSearch> {
  return db.savedSearch.create({ data });
}

export async function update(
  id: string,
  userId: string,
  tenantId: string,
  data: Partial<{
    name: string;
    filters: Prisma.InputJsonValue;
    filtersHash: string;
    notifyNew: boolean;
  }>,
  db: SavedSearchDbClient = prisma,
): Promise<SavedSearch | null> {
  const existing = await findById(id, userId, tenantId, db);
  if (!existing) {
    return null;
  }

  return db.savedSearch.update({
    where: { id },
    data,
  });
}

export async function deleteById(
  id: string,
  userId: string,
  tenantId: string,
  db: SavedSearchDbClient = prisma,
): Promise<boolean> {
  const result = await db.savedSearch.deleteMany({
    where: { id, userId, tenantId },
  });

  return result.count > 0;
}
