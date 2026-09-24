const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // No auto-seed: admin is created via the /setup page on first launch
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  if (adminCount === 0) {
    console.log('No admin found. Visit /setup to create the admin account on first launch.');
  } else {
    console.log('Admin user already exists. Skipping seed.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
