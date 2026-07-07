const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const room = await prisma.room.findUnique({ where: { id: 5 } });
  console.log(room);
}
main().catch(console.error).finally(() => prisma.$disconnect());
