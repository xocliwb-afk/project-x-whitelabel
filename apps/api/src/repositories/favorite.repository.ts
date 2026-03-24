import { Prisma, prisma } from '@project-x/database';
import type { Favorite } from '@project-x/database';

type FavoriteDbClient = typeof prisma | Prisma.TransactionClient;

export async function findByUser(
  userId: string,
  tenantId: string,
  page: number,
  limit: number,
  db: FavoriteDbClient = prisma,
): Promise<{ items: Favorite[]; total: number }> {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    db.favorite.findMany({
      where: { userId, tenantId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    db.favorite.count({
      where: { userId, tenantId },
    }),
  ]);

  return { items, total };
}

export async function findIdsByUser(
  userId: string,
  tenantId: string,
  db: FavoriteDbClient = prisma,
): Promise<string[]> {
  const favorites = await db.favorite.findMany({
    where: { userId, tenantId },
    orderBy: { createdAt: 'desc' },
    select: { listingId: true },
  });

  return favorites.map((favorite) => favorite.listingId);
}

export async function findByUserAndListing(
  userId: string,
  tenantId: string,
  listingId: string,
  db: FavoriteDbClient = prisma,
): Promise<Favorite | null> {
  return db.favorite.findFirst({
    where: { userId, tenantId, listingId },
  });
}

export async function create(
  data: {
    userId: string;
    tenantId: string;
    listingId: string;
  },
  db: FavoriteDbClient = prisma,
): Promise<Favorite> {
  return db.favorite.create({ data });
}

export async function deleteByListingId(
  userId: string,
  tenantId: string,
  listingId: string,
  db: FavoriteDbClient = prisma,
): Promise<boolean> {
  const result = await db.favorite.deleteMany({
    where: { userId, tenantId, listingId },
  });

  return result.count > 0;
}
