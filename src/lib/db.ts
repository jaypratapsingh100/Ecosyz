import { PrismaClient, Prisma } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

const logLevels: Prisma.LogLevel[] = process.env.NODE_ENV === 'development' 
  ? ['query', 'error', 'warn'] 
  : ['error'];

// Only create PrismaClient if DATABASE_URL is available
// During build time (prisma generate), Prisma doesn't actually connect to the database
// but the client constructor still validates the URL format
const createPrismaClient = () => {
  if (!process.env.DATABASE_URL) {
    // During build/generate phase, use a dummy URL to allow Prisma Client generation
    // This URL is only used for validation, not actual connection during generate
    if (process.env.NEXT_PHASE === 'phase-production-build' || process.env.VERCEL_ENV) {
      // Use a valid PostgreSQL URL format for build-time validation
      return new PrismaClient({
        log: logLevels,
        datasources: {
          db: {
            url: 'postgresql://build:build@localhost:5432/build?schema=public',
          },
        },
      });
    }
    // For runtime without DATABASE_URL, throw error
    throw new Error('DATABASE_URL is required but not set. Please configure it in your environment variables.');
  }

  return new PrismaClient({
    log: logLevels,
  });
};

export const prisma = global.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
