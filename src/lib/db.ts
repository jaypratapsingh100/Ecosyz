import { PrismaClient, Prisma } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

const logLevels: Prisma.LogLevel[] = process.env.NODE_ENV === 'development'
  ? ['query', 'error', 'warn']
  : ['error'];

let prismaClient: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    prismaClient = global.prisma || new PrismaClient({
      log: logLevels,
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Add pgBouncer compatibility for Supabase
      transactionOptions: {
        maxWait: 20000,
        timeout: 20000,
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      global.prisma = prismaClient;
    }
  }

  return prismaClient;
}

// Export a proxy that defers initialization until first access
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getPrismaClient();
    return (client as any)[prop];
  }
});