import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: pg.Pool;
};

const connectionString = process.env.DATABASE_URL;

export function getPrismaClient(): PrismaClient | null {
  if (!connectionString) {
    return null;
  }

  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  try {
    const pool = globalForPrisma.pgPool ?? new pg.Pool({ connectionString });
    globalForPrisma.pgPool = pool;

    const adapter = new PrismaPg(pool);
    const client = new PrismaClient({ adapter });

    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = client;
    }

    return client;
  } catch (err) {
    console.error("Failed to initialize Prisma with PostgreSQL adapter:", err);
    return null;
  }
}

export const prisma = getPrismaClient();
