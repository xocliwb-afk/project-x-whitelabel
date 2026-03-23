import { prisma } from '@project-x/database';
import type { Tour, TourStop } from '@project-x/database';

type TourWithStops = Tour & { stops: TourStop[] };

const INCLUDE_STOPS = { stops: { orderBy: { order: 'asc' as const } } };

export async function create(data: {
  tenantId: string;
  userId?: string | null;
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
}): Promise<TourWithStops> {
  const { stops, narrationPayloads, ...tourData } = data;
  return prisma.tour.create({
    data: {
      ...tourData,
      userId: tourData.userId ?? null,
      narrationPayloads: narrationPayloads != null ? JSON.parse(JSON.stringify(narrationPayloads)) : undefined,
      stops: {
        create: stops,
      },
    },
    include: INCLUDE_STOPS,
  });
}

export async function findById(id: string, tenantId: string): Promise<TourWithStops | null> {
  return prisma.tour.findFirst({
    where: { id, tenantId },
    include: INCLUDE_STOPS,
  });
}

export async function findAll(options: {
  tenantId: string;
  userId?: string | null;
}): Promise<TourWithStops[]> {
  const where: Record<string, unknown> = { tenantId: options.tenantId };
  if (options.userId !== undefined && options.userId !== null) {
    where.userId = options.userId;
  }
  return prisma.tour.findMany({
    where,
    include: INCLUDE_STOPS,
    orderBy: { createdAt: 'desc' },
  });
}

export async function update(
  id: string,
  tenantId: string,
  data: {
    title?: string;
    clientName?: string;
    date?: string;
    startTime?: string;
    defaultDurationMinutes?: number;
    defaultBufferMinutes?: number;
    narrationPayloads?: unknown;
    stops?: Array<{
      listingId: string;
      order: number;
      address: string;
      lat: number;
      lng: number;
      thumbnailUrl?: string | null;
      startTime?: string | null;
      endTime?: string | null;
    }>;
  },
): Promise<TourWithStops | null> {
  // Check existence + tenant ownership
  const existing = await prisma.tour.findFirst({ where: { id, tenantId } });
  if (!existing) return null;

  const { stops, narrationPayloads, ...tourFields } = data;

  // If stops are provided, delete existing and create new ones in a transaction
  if (stops) {
    return prisma.$transaction(async (tx) => {
      await tx.tourStop.deleteMany({ where: { tourId: id } });
      return tx.tour.update({
        where: { id },
        data: {
          ...tourFields,
          narrationPayloads: narrationPayloads !== undefined
            ? (narrationPayloads != null ? JSON.parse(JSON.stringify(narrationPayloads)) : null)
            : undefined,
          stops: { create: stops },
        },
        include: INCLUDE_STOPS,
      });
    });
  }

  return prisma.tour.update({
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

export async function deleteById(id: string, tenantId: string): Promise<boolean> {
  const result = await prisma.tour.deleteMany({ where: { id, tenantId } });
  return result.count > 0;
}
