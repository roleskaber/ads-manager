import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

// In dev the client is cached on globalThis to survive hot reloads. It is keyed by the
// PrismaClient class so that `prisma generate` (new class) replaces a stale cached client.
const globalForPrisma = globalThis as unknown as { prisma?: { client: PrismaClient; ctor: typeof PrismaClient } };

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

function getClient() {
  const cached = globalForPrisma.prisma;
  if (cached?.ctor === PrismaClient) return cached.client;

  void cached?.client?.$disconnect();
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = { client, ctor: PrismaClient };
  return client;
}

export const db = getClient();
