import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const rooms = await prisma.room.findMany({
    include: { players: true }
  });
  console.dir(rooms, { depth: null });
}

check().catch(console.error).finally(() => prisma.$disconnect());
