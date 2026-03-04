import { PrismaClient } from "@/lib/generated/prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

const prismaLogLevels: Array<"query" | "error" | "info" | "warn"> =
  process.env.NODE_ENV === "production"
    ? ["error", "warn"]
    : process.env.PRISMA_LOG_QUERIES === "true"
      ? ["query", "error", "warn"]
      : ["error", "warn"];

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: prismaLogLevels,
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
