const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Wiping out-of-sync players...");
  await prisma.player.deleteMany({});
  console.log("Wiping out-of-sync rooms...");
  await prisma.room.deleteMany({});
  console.log("Database wiped!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
