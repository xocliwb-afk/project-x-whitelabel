import { Prisma, prisma } from '@project-x/database';
import type { Tour, TourStop } from '@project-x/database';
import type { UserRole } from '@project-x/shared-types';

type TourWithStops = Tour & { stops: TourStop[] };
type TourDbClient = typeof prisma | Prisma.TransactionClient;
export type TourAccessScope = {
  tenantId: string;
  userId: string;
  role: UserRole;
};

const INCLUDE_STOPS = { stops: { orderBy: { order: 'asc' as const } } };

function isPrivilegedRole(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'AGENT';
}

function buildScopedWhere(scope: TourAccessScope): Prisma.TourWhereInput {
  const where: Prisma.TourWhereInput = { tenantId: scope.tenantId };
  if (!isPrivilegedRole(scope.role)) {
    where.userId = scope.userId;
  }
  return where;
}

export async function create(data: {
  tenantId: string;
  userId: string;
  title: string;
  clientName: string;
  date: string;
  startTime: string;
  defaultDurationMinutes: number;
  defaultBufferMinutes: number;
  narrationPayloads?: unknown;
  stops: Array<{
    listingId: string;
    order: number;
    address: string;
    lat: number;
    lng: number;
    thumbnailUrl?: string | null;
    startTime?: string | null;
    endTime?: string | null;
  }>;
}, db: TourDbClient = prisma): Promise<TourWithStops> {
  const { stops, narrationPayloads, ...tourData } = data;
  return db.tour.create({
    data: {
      ...tourData,
      narrationPayloads: narrationPayloads != null ? JSON.parse(JSON.stringify(narrationPayloads)) : undefined,
      stops: {
        create: stops,
      },
    },
    include: INCLUDE_STOPS,
  });
}

export async function findById(
  id: string,
  scope: TourAccessScope,
  db: TourDbClient = prisma,
): Promise<TourWithStops | null> {
  return db.tour.findFirst({
    where: {
      id,
      ...buildScopedWhere(scope),
    },
    include: INCLUDE_STOPS,
  });
}

export async function findAll(
  scope: TourAccessScope,
  db: TourDbClient = prisma,
): Promise<TourWithStops[]> {
  return db.tour.findMany({
    where: buildScopedWhere(scope),
    include: INCLUDE_STOPS,
    orderBy: { createdAt: 'desc' },
  });
}

export async function update(
  id: string,
  scope: TourAccessScope,
  data: {
    title?: string;
    clientName?: string;
    date?: string;
    startTime?: string;
    defaultDurationMinutes?: number;
    defaultBufferMinutes?: number;
    narrationPayloads?: unknown;
  },
  db: TourDbClient = prisma,
): Promise<TourWithStops | null> {
  const existing = await db.tour.findFirst({
    where: {
      id,
      ...buildScopedWhere(scope),
    },
  });
  if (!existing) return null;

  const { narrationPayloads, ...tourFields } = data;

  return db.tour.update({
    where: { id },
    data: {
      ...tourFields,
      narrationPayloads: narrationPayloads !== undefined
        ? (narrationPayloads != null ? JSON.parse(JSON.stringify(narrationPayloads)) : null)
        : undefined,
    },
    include: INCLUDE_STOPS,
  });
}

export async function deleteById(
  id: string,
  scope: TourAccessScope,
  db: TourDbClient = prisma,
): Promise<boolean> {
  const result = await db.tour.deleteMany({
    where: {
      id,
      ...buildScopedWhere(scope),
    },
  });
  return result.count > 0;
}
