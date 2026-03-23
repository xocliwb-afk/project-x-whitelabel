import { prisma } from '@project-x/database';
import type { User } from '@project-x/database';

export async function findBySupabaseId(supabaseId: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { supabaseId } });
}

export async function findById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function create(data: {
  supabaseId: string;
  tenantId: string;
  email: string;
  displayName?: string | null;
  phone?: string | null;
}): Promise<User> {
  return prisma.user.create({ data });
}

export async function update(id: string, data: {
  displayName?: string | null;
  phone?: string | null;
}): Promise<User> {
  return prisma.user.update({ where: { id }, data });
}
