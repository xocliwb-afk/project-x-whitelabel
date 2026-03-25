import { prisma } from '@project-x/database';
import type { Brand, Prisma } from '@project-x/database';

type BrandDbClient = typeof prisma | Prisma.TransactionClient;

export async function findByTenant(
  tenantId: string,
  db: BrandDbClient = prisma,
): Promise<Brand | null> {
  return db.brand.findUnique({
    where: { tenantId },
  });
}

export async function updateByTenant(
  tenantId: string,
  data: {
    config?: unknown;
    logoUrl?: string | null;
    faviconUrl?: string | null;
  },
  db: BrandDbClient = prisma,
): Promise<Brand | null> {
  const updateData: Prisma.BrandUpdateManyMutationInput = {};

  if (data.config !== undefined) {
    updateData.config = data.config as Prisma.InputJsonValue;
  }

  if (data.logoUrl !== undefined) {
    updateData.logoUrl = data.logoUrl;
  }

  if (data.faviconUrl !== undefined) {
    updateData.faviconUrl = data.faviconUrl;
  }

  const result = await db.brand.updateMany({
    where: { tenantId, active: true },
    data: updateData,
  });

  if (result.count === 0) {
    return null;
  }

  return db.brand.findUnique({
    where: { tenantId },
  });
}
