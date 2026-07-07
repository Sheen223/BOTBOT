import { prisma } from './src/prisma/client';

async function main() {
  console.log("Wiping out-of-sync player sessions...");
  await prisma.playerSession?.deleteMany({});
  console.log("Wiping out-of-sync players...");
  await prisma.player.deleteMany({});
  console.log("Wiping out-of-sync messages...");
  await prisma.message?.deleteMany({});
  console.log("Wiping out-of-sync rooms...");
  await prisma.room.deleteMany({});
  console.log("Database wiped!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
