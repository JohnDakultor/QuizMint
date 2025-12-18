// src/lib/cleanupPublicUsage.ts
import { prisma } from "@/lib/prisma";

export async function cleanupOldPublicUsage() {
  const TWO_WEEKS_AGO = new Date(Date.now() - 3 * 60 * 60 * 1000); //new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const deleted = await prisma.publicUsage.deleteMany({
    where: {
      updatedAt: {
        lt: TWO_WEEKS_AGO,
      },
    },
  });
  console.log(`Deleted old public usage records`);
}
