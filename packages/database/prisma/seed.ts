import { PrismaClient } from '@prisma/client';

// Use DIRECT_URL for seed operations — the Supabase pooler (DATABASE_URL)
// doesn't support the transaction patterns needed for upserts.
const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

async function main() {
  // Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      slug: 'default',
      name: 'Project X',
      active: true,
    },
  });
  console.log(`Default tenant: ${tenant.id} (slug: ${tenant.slug})`);

  // Try to read brand.json for initial brand config
  let brandConfig = {};
  try {
    const fs = await import('fs');
    const path = await import('path');
    const brandPath = path.resolve(__dirname, '../../../config/brand.json');
    const raw = fs.readFileSync(brandPath, 'utf-8');
    brandConfig = JSON.parse(raw);
    console.log('Loaded brand config from config/brand.json');
  } catch {
    console.log('No brand.json found, using empty brand config');
  }

  // Upsert brand for tenant
  await prisma.brand.upsert({
    where: { tenantId: tenant.id },
    update: { config: brandConfig },
    create: {
      tenantId: tenant.id,
      config: brandConfig,
      active: true,
    },
  });
  console.log('Brand config seeded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
